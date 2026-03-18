import { Router } from "express";
import { getFileJobById } from "../db/query.db.js";
import { getFileMetadataById } from "../db/query.db.js";
import { getPresignedDownloadUrl } from "../conn/s3.conn.js";
import { NotFoundError, ValidationError } from "../error.js";
import { asyncErrorHandler } from "../middleware/error.middleware.js";
import {
	createApiSuccessResponse,
	sendApiResponse,
} from "../utils/response.utils.js";
import { z } from "zod";
import validate from "../zod/validate.js";
import { JobStatusParamsSchema } from "../zod/status.z.js";

const router = Router();

router.get(
	"/:jobId",
	asyncErrorHandler(async (req, res) => {
		const validationResult = validate(JobStatusParamsSchema, req.params);

		if (!validationResult.success) {
			throw new ValidationError(
				"Invalid request params",
				"VALIDATION_ERROR",
				z.flattenError(validationResult.error),
			);
		}

		const { jobId } = validationResult.data;
		const job = await getFileJobById(jobId);

		if (!job) {
			throw new NotFoundError("Job not found");
		}

		const response: Record<string, unknown> = {
			jobId: job.id,
			status: job.status,
			processedUrl: null,
			filename: null,
		};

		if (job.status === "completed") {
			const metadata = await getFileMetadataById(job.file_id);
			if (metadata) {
				response.processedUrl = metadata.file_path;
				response.filename = metadata.filename;
			}
		}

		return sendApiResponse(
			res,
			createApiSuccessResponse(
				"Job status retrieved successfully",
				200,
				response,
			),
		);
	}),
);

router.get(
	"/:jobId/download",
	asyncErrorHandler(async (req, res) => {
		const validationResult = validate(JobStatusParamsSchema, req.params);

		if (!validationResult.success) {
			throw new ValidationError(
				"Invalid request params",
				"VALIDATION_ERROR",
				z.flattenError(validationResult.error),
			);
		}

		const { jobId } = validationResult.data;
		const job = await getFileJobById(jobId);

		if (!job) {
			throw new NotFoundError("Job not found");
		}

		if (job.status !== "completed") {
			throw new ValidationError("Job not completed yet", "VALIDATION_ERROR");
		}

		const metadata = await getFileMetadataById(job.file_id);
		if (!metadata) {
			throw new NotFoundError("File metadata not found");
		}

		const downloadUrl = await getPresignedDownloadUrl(metadata.file_path);

		return sendApiResponse(
			res,
			createApiSuccessResponse("Download URL generated successfully", 200, {
				downloadUrl,
			}),
		);
	}),
);

export default router;
