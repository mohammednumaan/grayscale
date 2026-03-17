export class ApiError extends Error {
	public readonly statusCode: number;
	public readonly apiErrorCode: string;
	public readonly description?: unknown;

	constructor(
		message: string,
		statusCode: number,
		apiErrorCode: string,
		description?: unknown,
	) {
		super(message);
		this.statusCode = statusCode;
		this.apiErrorCode = apiErrorCode;
		this.description = description;

		Object.setPrototypeOf(this, ApiError.prototype);
		Error.captureStackTrace(this, this.constructor);
	}
}

export class NotFoundError extends ApiError {
	constructor(
		message = "The requested resource was not found.",
		apiErrorCode = "NOT_FOUND",
		description?: unknown,
	) {
		super(message, 404, apiErrorCode, description);
		this.name = "NotFoundError";
	}
}

export class BadRequestError extends ApiError {
	constructor(
		message = "The request was invalid or cannot be served.",
		apiErrorCode = "BAD_REQUEST",
		description?: unknown,
	) {
		super(message, 400, apiErrorCode, description);
		this.name = "BadRequestError";
	}
}


export class ValidationError extends ApiError {
	constructor(
		message = "The request data is invalid.",
		apiErrorCode = "VALIDATION_ERROR",
		description?: unknown,
	) {
		super(message, 422, apiErrorCode, description);
		this.name = "ValidationError";
	}
}
