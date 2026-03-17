import { z } from "zod";

const ApiErrorSchema = z.object({
	code: z.string(),
	description: z.unknown().optional(),
});

function createApiResponseSchema<T extends z.ZodTypeAny>(dataSchema: T) {
	return z.object({
		message: z.string(),
		statusCode: z.number().int().positive(),
		success: z.boolean(),
		data: dataSchema.optional(),
		error: ApiErrorSchema.optional(),
	});
}

type ApiErrorType = z.infer<typeof ApiErrorSchema>;

export { ApiErrorSchema, createApiResponseSchema, type ApiErrorType };
