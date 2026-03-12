import express from "express";
import cors from "cors";

import { configDotenv } from "dotenv";
import uploadRouter from "./api/upload.api.js";
import signedRouter from "./api/signed.api.js";

configDotenv();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// endpoint to handle upload completion (metadata persistence)
app.use("/grayscale", uploadRouter);
// endpoint to generate signed upload credentials for direct Cloudinary uploads
app.use("/grayscale/api", signedRouter);

app.listen(PORT, () => {
  console.log(`[Server]: Running on port ${PORT}`);
});

console.log(`This process is pid ${process.pid}`);
