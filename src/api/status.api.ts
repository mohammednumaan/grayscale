import { Router } from "express";
import { getFileJobById } from "../db/query.db.js";
import { getFileMetadataById } from "../db/query.db.js";
import { NotFoundError, ValidationError } from "../error.js";
import { asyncErrorHandler } from "../middleware/error.middleware.js";
import {
	createApiSuccessResponse,
	sendApiResponse,
} from "../utils/response.utils.js";

const router = Router();

router.get("/:jobId", asyncErrorHandler(async (req, res) => {
	const jobId = Number(req.params.jobId);

	if (Number.isNaN(jobId)) {
		throw new ValidationError("Invalid job ID");
	}
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
		createApiSuccessResponse("Job status retrieved successfully", 200, response),
	);
}));

export default router;
