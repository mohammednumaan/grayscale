import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import multer from "multer";

import grayscaleQueue from "../conn/queue.conn.js";
import cloudinaryConn from "../conn/cloudinary.conn.js";

import type { FileMetadata } from "../types/types.js";
import CloudinaryStorageEngine from "../utils/cloudinary-engine.utils.js";
import { insertFileMetadata } from "../db/query.db.js";

const router = Router();
const storage = new CloudinaryStorageEngine();
const upload = multer({ storage });

router.post("/upload", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  // 1. upload the file to Cloudinary
  // 2. add a job to the queue with the file metadata
  // 3. return the response to the client
  await insertFileMetadata({
    filename: req.file.originalname,
    size: req.file.size,
    file_path: req.file.path,
  });
  return res.json({
    message: "File uploaded successfully",
    filename: req.file.originalname,
  });
});

export default router;
