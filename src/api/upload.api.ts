import { Router } from "express";
import { insertFileJob, insertFileMetadata } from "../db/query.db.js";
import type { FileJobs, FileMetadata } from "../types/types.js";
import grayscaleQueue from "../conn/queue.conn.js";
import cloudinary from "../conn/cloudinary.conn.js";
import { v4 as uuidv4 } from "uuid";
import env from "../env.js";
import { ApiError, ValidationError } from "../error.js";
import { asyncErrorHandler } from "../middleware/error.middleware.js";
import {
	createApiSuccessResponse,
	sendApiResponse,
} from "../utils/response.utils.js";

const router = Router();

router.get("/sign", asyncErrorHandler(async (_req, res) => {
	const timeStamp = Math.round(new Date().getTime() / 1000);
	const folder = "uploads";
	const public_id = `${folder}/${uuidv4()}`;
	const apiSecret = env.cloudinary.apiSecret;
	const cloudName = env.cloudinary.cloudName;
	const apiKey = env.cloudinary.apiKey;

	if (!apiSecret || !cloudName || !apiKey) {
		throw new ApiError(
			"Cloudinary configuration is incomplete",
			500,
			"INTERNAL_SERVER_ERROR",
		);
	}

	const paramsToSign = {
		timestamp: timeStamp,
		public_id,
		folder,
	};

	const signature = await cloudinary.utils.api_sign_request(
		paramsToSign,
		apiSecret,
	);

	return sendApiResponse(
		res,
		createApiSuccessResponse("Signature generated successfully", 200, {
			signature,
			public_id,
			folder,
			timestamp: timeStamp,
			cloud_name: cloudName,
			api_key: apiKey,
		}),
	);
}));


router.post("/complete", asyncErrorHandler(async (req, res) => {
	const { filename, size, file_path } = req.body;

	if (!filename || !size || !file_path) {
		throw new ValidationError(
			"Missing required fields: filename, size, file_path",
		);
	}

	if (typeof filename !== "string" || typeof file_path !== "string") {
		throw new ValidationError("filename and file_path must be strings");
	}

	if (typeof size !== "number" || Number.isNaN(size) || size <= 0) {
		throw new ValidationError("size must be a positive number");
	}

	// Persist metadata before enqueueing so status lookups work for accepted jobs.
	const fileMetadata: FileMetadata = await insertFileMetadata({
		filename,
		size,
		file_path,
	});
	const fileJob: FileJobs = await insertFileJob({
		file_id: fileMetadata.id,
		status: "pending",
	});

	await grayscaleQueue.add(
		"grayscale-job",
		{
			jobId: fileJob.id,
			filePath: fileMetadata.file_path,
		},
		{
			attempts: 3,
			backoff: {
				type: "exponential",
				delay: 3000,
			},
			removeOnComplete: { count: 100 },
			removeOnFail: { count: 200 },
		},
	);

	return sendApiResponse(
		res,
		createApiSuccessResponse("File metadata saved successfully", 200, {
			filename,
			jobId: fileJob.id,
		}),
	);
}));

export default router;
