import { Job, Worker } from "bullmq";
import { updateProcessedFilePath, updateFileJobStatus } from "./db/query.db.js";
import type { UploadApiResponse } from "cloudinary";
import cluster from "cluster";
import os from "os";
import sharp from "sharp";
import { cloudinary, getRedisConfig } from "./conn.js";
import type { IWorkerJob } from "./types/types.js";

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
		async (job: Job<IWorkerJob>) => {
			try {
				await updateFileJobStatus(job.data.jobId, "processing");

				const response = await fetch(job.data.originalFilePath);
				if (!response.ok) {
					throw new Error(
						`Failed to fetch image from ${job.data.originalFilePath}: ${response.statusText}`,
					);
				}

				const responseBuffer = Buffer.from(await response.arrayBuffer());
				const finalImageBuffer = await sharp(responseBuffer)
					.grayscale()
					.jpeg()
					.toBuffer();
				const uploadResult = await new Promise<UploadApiResponse>(
					(resolve, reject) => {
						const uploadStream = cloudinary.uploader.upload_stream(
							{
								folder: "grayscale-uploads",
							},
							(error, result) => {
								if (error) {
									reject(error);
								} else if (result) {
									resolve(result);
								} else {
									reject(new Error("Cloudinary upload returned no result"));
								}
							},
						);
						uploadStream.end(finalImageBuffer);
					},
				);

				await updateProcessedFilePath(uploadResult.secure_url, job.data.jobId);
				await updateFileJobStatus(job.data.jobId, "completed");
				process.send?.({ type: "completed", jobId: job.id });
				return uploadResult;
			} catch (error) {
				await updateFileJobStatus(job.data.jobId, "failed");
				process.send?.({
					type: "failed",
					jobId: job.id,
					error: (error as Error).message,
				});
				throw error;
			}
		},
		{ connection, concurrency: 5, removeOnComplete: { count: 100 } },
	);

	console.log(`Worker ${process.pid} started`);
}
