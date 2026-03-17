import type { Request, Response, NextFunction } from "express";
import { ApiError } from "../error.js";
import {
	createApiErrorResponse,
	sendApiResponse,
} from "../utils/response.utils.js";

export function asyncErrorHandler(
	callback: (req: Request, res: Response, next: NextFunction) => void,
) {
	return async function(req: Request, res: Response, next: NextFunction) {
		try {
			await callback(req, res, next);
		} catch (error) {
			if (error instanceof ApiError) {
				const errorResponse = createApiErrorResponse(
					error.message,
					error.statusCode,
					error.apiErrorCode,
					error.description,
				);
				return sendApiResponse(res, errorResponse);
			} else if (error instanceof Error) {
				const errorResponse = createApiErrorResponse(
					"Something went wrong",
					500,
					"INTERNAL_SERVER_ERROR",
					error.message,
				);
				return sendApiResponse(res, errorResponse);
			}
		}
	};
}
