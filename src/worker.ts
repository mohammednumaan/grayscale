import { Job, Worker } from "bullmq";
import { type FileJobData } from "./types/types.js";
import { Jimp } from "jimp";
import cloudinary from "./conn/cloudinary.conn.js";
import { updateFileMetadata, updateFileJobStatus } from "./db/query.db.js";
import type { UploadApiResponse } from "cloudinary";
import cluster from 'cluster'
import os from 'os';
import { Redis } from "ioredis";


const numCPUs = os.cpus().length;
const WORKERS_PER_CPU = 1;

if (cluster.isPrimary) {
	console.log(`Primary ${process.pid} starting ${numCPUs * WORKERS_PER_CPU} workers`);
	for (let i = 0; i < numCPUs * WORKERS_PER_CPU; i++) {
		cluster.fork();
	}

	cluster.on('exit', (worker, code, signal) => {
		console.log(`Worker ${worker.process.pid} died (${signal || code}). Restarting...`);
		cluster.fork();
	})
	cluster.on('message', (worker, message) => {
		console.log(`Message from worker ${worker.id}:`, message);
	});
}

else {
	const connection = new Redis({
		host: 'localhost',
		port: 6379,
		maxRetriesPerRequest: null
	})
	const worker = new Worker("grayscale-queue", async (job: Job<FileJobData>) => {
		const response = await fetch(job.data.filePath);
		if (!response.ok) {
			throw new Error(`Failed to fetch image from ${job.data.filePath}: ${response.statusText}`);
		}

		const responseBuffer = await response.arrayBuffer();
		const image = await Jimp.fromBuffer(responseBuffer);
		image.greyscale();

		const finalImageBuffer = await image.getBuffer("image/jpeg");
		const uploadResult = await new Promise<UploadApiResponse>((resolve, reject) => {
			const uploadStream = cloudinary.uploader.upload_stream({ folder: "grayscale-uploads" }, (error, result) => {
				if (error) {
					reject(error);
				}
				else if (result) {
					resolve(result);
				}
				else {
					reject(new Error("Cloudinary upload returned no result"));
				}
			});

			uploadStream.end(finalImageBuffer);
		});

		await updateFileMetadata(uploadResult.secure_url, job.data.jobId);
		return uploadResult;

	}, { connection, concurrency: 5, removeOnComplete: { count: 10 } });

	worker.on("completed", async (job, result) => {
		await updateFileJobStatus(job.data.jobId, "completed");
		process.send?.({ type: 'completed', jobId: job.id });

	});

	worker.on('failed', async (job, err) => {
		process.send?.({ type: 'failed', jobId: job?.id, error: err.message });
	});

	console.log(`Worker ${process.pid} started`);
}

