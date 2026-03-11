import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';

import grayscaleQueue from '../conn/queue.conn.js';
import cloudinaryConn from '../conn/cloudinary.conn.js';

import type { FileMetadata } from '../types/types.js';
import CloudinaryStorageEngine from '../storage/cloudinary-engine.js';

const router = Router();
const storage = new CloudinaryStorageEngine();
const upload = multer({ storage });

router.post('/upload', upload.single('image'), async (req, res) => {
	if (!req.file) {
		return res.status(400).json({ error: "No file uploaded" });
	}

	const metadata: FileMetadata = {
		id: uuidv4(),
		name: req.file.originalname,
		size: req.file.size,
		type: req.file.mimetype,
		createdAt: new Date(),
		updatedAt: new Date(),
		filePath: req.file.path
	}

	// 1. upload the file to Cloudinary
	// 2. add a job to the queue with the file metadata
	// 3. return the response to the client
	return res.json({ message: "File uploaded successfully", filename: req.file.originalname });
});

export default router;
