import { Router } from "express";
import { insertFileJob, insertFileMetadata } from "../db/query.db.js";
import type { FileJobsType, FileMetadataType } from "../types/types.js";
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
import { z } from "zod";
import validate from "../zod/validate.js";
import { UploadCompleteBodySchema } from "../zod/upload.z.js";

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
	const validationResult = validate(UploadCompleteBodySchema, req.body);

	if (!validationResult.success) {
		throw new ValidationError(
			"Invalid request body",
			"VALIDATION_ERROR",
			z.flattenError(validationResult.error),
		);
	}

	const { filename, size, file_path } = validationResult.data;

	const fileMetadata: FileMetadataType = await insertFileMetadata({
		filename,
		size,
		file_path,
	});
	const fileJob: FileJobsType = await insertFileJob({
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
