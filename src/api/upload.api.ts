import { Router } from "express";
import { insertFileMetadata } from "../db/query.db.js";

const router = Router();

router.post("/upload", async (req, res) => {
	const { filename, size, file_path } = req.body;

	if (!filename || !size || !file_path) {
		return res
			.status(400)
			.json({ error: "Missing required fields: filename, size, file_path" });
	}

	try {
		await insertFileMetadata({ filename, size, file_path });
		return res.json({ message: "File metadata saved successfully", filename });
	} catch (error) {
		console.error("Error saving file metadata:", error);
		return res.status(500).json({ error: "Failed to save file metadata" });
	}
});

export default router;
