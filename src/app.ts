import express, { type Request, type Response } from "express";
import cors from "cors";
import multer from "multer";

import { configDotenv } from "dotenv";
import uploadRouter from "./api/upload.api.js";
import pool from "./conn/pg.conn.js";

import { grayscaleImage } from "./utils/grayscale.utils.js";
configDotenv();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// endpoint to handle image upload and processing
app.use("/grayscale", uploadRouter);

app.listen(PORT, () => {
  console.log(`[Server]: Running on port ${PORT}`);
});

console.log(`This process is pid ${process.pid}`);
