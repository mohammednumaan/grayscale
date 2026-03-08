import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';

import grayscaleQueue from '../connections/queue.js';
import cloudinaryConn from '../connections/cloudinary.js';

import type { FileMetadata } from '../types/types.js';

const router = Router();
const upload = multer({ dest: '../../uploads/' });

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
