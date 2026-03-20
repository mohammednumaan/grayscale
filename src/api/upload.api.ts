import { Router } from "express";
import { insertFileJob } from "../db/query.db.js";
import { v4 as uuidv4 } from "uuid";
import env from "../env.js";
import { ApiError, BadRequestError, ValidationError } from "../error.js";
import { asyncErrorHandler } from "../middleware/error.middleware.js";
import {
	createApiSuccessResponse,
	sendApiResponse,
} from "../utils/response.utils.js";
import { z } from "zod";
import validate from "../zod/validate.js";
import { NotifyRequestSchema, type NotifyRequestType, type NotifyResponseType, type SignResponseType } from "../zod/api/upload.z.js";
import type { IFileJobs } from "../types/types.js";
import { cloudinary, grayscaleQueue } from "../conn.js";

const router = Router();

router.get(
	"/sign",
	asyncErrorHandler(async (_req, res) => {
		const timeStamp = Math.round(new Date().getTime() / 1000);
		const folder = "uploads";
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

		const public_id = `${folder}/${uuidv4()}`;
		const paramsToSign = {
			timestamp: timeStamp,
			public_id,
			folder,
		};

		const signature = cloudinary.utils.api_sign_request(
			paramsToSign,
			apiSecret,
		);

		const response: SignResponseType = {
			signature,
			public_id,
			folder,
			timestamp: timeStamp,
			cloud_name: cloudName,
			api_key: apiKey,
		}

		return sendApiResponse(
			res,
			createApiSuccessResponse("Signature generated successfully", 200, response),
		);
	}),
);

router.post(
	"/notify",
	asyncErrorHandler(async (req, res) => {
		const validationResult = validate<NotifyRequestType>(
			NotifyRequestSchema,
			req.body
		);

		if (!validationResult.success) {
			throw new ValidationError(
				"Invalid request body",
				"VALIDATION_ERROR",
				z.flattenError(validationResult.error),
			);
		}

		const { original_filename, public_id, secure_url } = validationResult.data;

		const assetExists = await cloudinary.uploader.explicit(public_id, { type: "upload", resource_type: "image" });
		if (!assetExists) {
			throw new BadRequestError("Asset with the given public_id does not exist in Cloudinary", "ASSET_NOT_FOUND");
		}

		const fileJob: IFileJobs = await insertFileJob({
			public_id,
			filename: original_filename,
			original_file_path: secure_url,
			status: "pending",
		});

		await grayscaleQueue.add(
			"grayscale-job",
			{
				jobId: fileJob.id,
				originalFilePath: fileJob.original_file_path,
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

		const response: NotifyResponseType = {
			filename: original_filename,
			jobId: fileJob.id,
		};

		return sendApiResponse(
			res,
			createApiSuccessResponse("File metadata saved successfully", 200, response)
		);
	}),
);

export default router;
