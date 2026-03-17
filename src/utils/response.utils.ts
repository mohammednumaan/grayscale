import { type Response } from "express";

interface ApiResponseType<T = unknown> {
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
): ApiResponseType<T> {
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
): ApiResponseType {
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

export function sendApiResponse<T>(res: Response, response: ApiResponseType<T>) {
	return res.status(response.statusCode).json(response);
}
