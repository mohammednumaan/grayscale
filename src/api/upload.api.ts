import { Router } from "express";
import { insertFileJob, insertFileMetadata } from "../db/query.db.js";
import type { FileJobs, FileMetadata } from "../types/types.js";
import grayscaleQueue from "../conn/queue.conn.js";

const router = Router();

router.post("/upload", async (req, res) => {
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
		})
		return res.json({ message: "File metadata saved successfully", filename, jobId: fileJob.id });
	} catch (error) {
		console.error("Error saving file metadata:", error);
		return res.status(500).json({ error: "Failed to save file metadata" });
	}
});

export default router;
