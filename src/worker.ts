import { Job, Worker } from "bullmq";
import { type FileJobData } from "./types/types.js";
import { Jimp } from "jimp";
import cloudinary from "./conn/cloudinary.conn.js";

const worker = new Worker("grayscale-queue", async (job: Job<FileJobData>) => {

	const response = await fetch(job.data.filePath);
	if (!response.ok) {
		throw new Error(`Failed to fetch image from ${job.data.filePath}: ${response.statusText}`);
	}

	const responseBuffer = await response.arrayBuffer();

	const image = await Jimp.fromBuffer(responseBuffer);
	await image.greyscale();

	const finalImageBuffer = await image.getBuffer("image/jpeg");
	const uploadResult = await new Promise((resolve, reject) => {
		const uploadStream = cloudinary.uploader.upload_stream({ folder: "grayscale-uploads" }, (error, result) => {
			if (error) {
				reject(error);
			} else {
				resolve(result);
			}
		});
		uploadStream.end(finalImageBuffer);
	});

	return uploadResult;
}, { connection: { host: 'localhost', port: 6379 } });

worker.on("completed", (job, result) => {
	console.log(`Job ${job.id} completed with result:`, result);
});
