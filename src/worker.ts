import { Job, Worker } from "bullmq";
import { type FileJobDataType } from "./types/types.js";
import { getPresignedDownloadUrl, s3Client } from "./conn/s3.conn.js";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { updateFileMetadata, updateFileJobStatus } from "./db/query.db.js";
import cluster from "cluster";
import os from "os";
import sharp from "sharp";
import { getRedisConfig } from "./conn/redis.conn.js";
import env from "./env.js";

const numCPUs = os.cpus().length;
const WORKERS_PER_CPU = 1;

if (cluster.isPrimary) {
	console.log(
		`Primary ${process.pid} starting ${numCPUs * WORKERS_PER_CPU} workers`,
	);
	for (let i = 0; i < numCPUs * WORKERS_PER_CPU; i++) {
		cluster.fork();
	}

	cluster.on("exit", (worker, code, signal) => {
		console.log(
			`Worker ${worker.process.pid} died (${signal || code}). Restarting...`,
		);
		cluster.fork();
	});
	cluster.on("message", (worker, message) => {
		console.log(`Message from worker ${worker.id}:`, message);
	});
} else {
	const connection = getRedisConfig();
	const worker = new Worker(
		"grayscale-queue",
		async (job: Job<FileJobDataType>) => {
			await updateFileJobStatus(job.data.jobId, "processing");

			const fileKey = job.data.fileKey;

			const downloadUrl = await getPresignedDownloadUrl(fileKey);

			const response = await fetch(downloadUrl);
			if (!response.ok) {
				throw new Error(
					`Failed to fetch image from S3: ${response.statusText}`,
				);
			}
			const responseBuffer = Buffer.from(await response.arrayBuffer());

			const processedBuffer = await sharp(responseBuffer)
				.grayscale()
				.jpeg()
				.toBuffer();

			const outputKey = fileKey.replace("uploads/", "processed/");

			await s3Client.send(
				new PutObjectCommand({
					Bucket: env.s3.bucket,
					Key: outputKey,
					Body: processedBuffer,
					ContentType: "image/jpeg",
				}),
			);

			await updateFileMetadata(outputKey, job.data.jobId);
			return { outputKey };
		},
		{
			connection: connection,
			concurrency: 5,
			removeOnComplete: { count: 100 },
		},
	);

	worker.on("completed", async (job, result) => {
		await updateFileJobStatus(job.data.jobId, "completed");
		process.send?.({ type: "completed", jobId: job.id });
	});

	worker.on("failed", async (job, err) => {
		if (job) {
			await updateFileJobStatus(job.data.jobId, "failed");
		}
		process.send?.({ type: "failed", jobId: job?.id, error: err.message });
	});

	console.log(`Worker ${process.pid} started`);
}
