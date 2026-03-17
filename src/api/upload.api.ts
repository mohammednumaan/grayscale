import { Router } from "express";
import { insertFileJob, insertFileMetadata } from "../db/query.db.js";
import type { FileJobs, FileMetadata } from "../types/types.js";
import grayscaleQueue from "../conn/queue.conn.js";
import cloudinary from "../conn/cloudinary.conn.js";
import { v4 as uuidv4 } from "uuid";

const router = Router();

router.get("/sign", async (req, res) => {
	const timeStamp = Math.round(new Date().getTime() / 1000);
	const folder = "uploads";
	const public_id = `${folder}/${uuidv4()}`;

	try {
		const paramsToSign = {
			timestamp: timeStamp,
			public_id,
			folder,
		};

		const signature = await cloudinary.utils.api_sign_request(
			paramsToSign,
			process.env.CLOUDINARY_API_SECRET!,
		);

		return res.json({
			message: "Signature generated successfully",
			signature,
			public_id,
			folder,
			timestamp: timeStamp,
			cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
			api_key: process.env.CLOUDINARY_API_KEY,
		});
	}
	catch (error) {
		console.error("Error generating signature:", error);
		return res
			.status(500)
			.json({ error: "Failed to generate upload signature" });
	}
});


router.post("/complete", async (req, res) => {
	const { filename, size, file_path } = req.body;

	if (!filename || !size || !file_path) {
		return res
			.status(400)
			.json({ error: "Missing required fields: filename, size, file_path" });
	}

	try {
		// here, i need to do the following things:
		// 1. save the file metadata to the database
		// 2. create a new job for the current file
		// 3. enqueue the job to the job queue
		// 4. return the response to the client
		const fileMetadata: FileMetadata = await insertFileMetadata({ filename, size, file_path });
		const fileJob: FileJobs = await insertFileJob({
			file_id: fileMetadata.id,
			status: "pending",
		})

		await grayscaleQueue.add("grayscale-job", {
			jobId: fileJob.id,
			filePath: fileMetadata.file_path,
		}, {
			attempts: 3,
			backoff: {
				type: "exponential",
				delay: 3000,
			},
			removeOnComplete: { count: 100 },
			removeOnFail: { count: 200 },
		})
		return res.status(200).json({ message: "File metadata saved successfully", filename, jobId: fileJob.id });
	} catch (error) {
		console.error("Error saving file metadata:", error);
		return res.status(500).json({ error: "Failed to save file metadata" });
	}
});

export default router;
