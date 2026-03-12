import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import cloudinary from "../conn/cloudinary.conn.js";
const router = Router();

router.post("/sign", async (req, res) => {
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
  } catch (error) {
    console.error("Error generating signature:", error);
    return res
      .status(500)
      .json({ error: "Failed to generate upload signature" });
  }
});

export default router;
