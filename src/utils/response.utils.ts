import { type Response } from "express";

interface ApiResponse<T = unknown> {
	message: string;
	statusCode: number;
	success: boolean;
	data?: T;
	error?: {
		code: string;
		description?: unknown;
	};
}

export function createApiSuccessResponse<T>(
	message: string,
	statusCode: number,
	data?: T,
): ApiResponse<T> {
	return {
		message,
		statusCode,
		success: true,
		data,
	};
}

export function createApiErrorResponse(
	message: string,
	statusCode: number,
	apiErrorCode: string,
	description?: unknown,
): ApiResponse {
	return {
		message,
		statusCode,
		success: false,
		error: {
			code: apiErrorCode,
			description,
		},
	};
}

export function sendApiResponse<T>(res: Response, response: ApiResponse<T>) {
	return res.status(response.statusCode).json(response);
}
