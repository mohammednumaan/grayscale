import { Job, Worker } from "bullmq";
import { type FileJobData } from "./types/types.js";
import { Jimp } from "jimp";
import cloudinary from "./conn/cloudinary.conn.js";
import { updateFileMetadata, updateFileJobStatus } from "./db/query.db.js";
import type { UploadApiResponse } from "cloudinary";

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

}, { connection: { host: 'localhost', port: 6379 }, removeOnComplete: { count: 10 } });

worker.on("completed", async (job, result) => {
	await updateFileJobStatus(job.data.jobId, "completed");
});

worker.on('failed', async (job, err) => {
	console.error(`Job ${job?.data.jobId} failed with error:`, err);
});
