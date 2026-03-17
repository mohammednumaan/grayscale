import { z } from "zod";
import { createApiResponseSchema } from "./api-response.z.js";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const UploadCompleteBodySchema = z.object({
	filename: z.string().min(1, "filename is required"),
	size: z
		.number()
		.positive("size must be a positive number")
		.max(MAX_FILE_SIZE, "File size exceeds the maximum allowed size of 10 MB"),
	file_path: z.string().url("file_path must be a valid URL"),
});

const UploadSignResponseDataSchema = z.object({
	signature: z.string(),
	public_id: z.string(),
	folder: z.string(),
	timestamp: z.number().int().positive(),
	cloud_name: z.string(),
	api_key: z.string(),
});

const UploadCompleteResponseDataSchema = z.object({
	filename: z.string(),
	jobId: z.number().int().positive(),
});

const UploadSignResponseSchema = createApiResponseSchema(
	UploadSignResponseDataSchema,
);

const UploadCompleteResponseSchema = createApiResponseSchema(
	UploadCompleteResponseDataSchema,
);

type UploadCompleteBodyType = z.infer<typeof UploadCompleteBodySchema>;
type UploadSignResponseDataType = z.infer<typeof UploadSignResponseDataSchema>;
type UploadCompleteResponseDataType = z.infer<
	typeof UploadCompleteResponseDataSchema
>;
type UploadSignResponseType = z.infer<typeof UploadSignResponseSchema>;
type UploadCompleteResponseType = z.infer<typeof UploadCompleteResponseSchema>;

export {
	UploadCompleteBodySchema,
	UploadSignResponseDataSchema,
	UploadCompleteResponseDataSchema,
	UploadSignResponseSchema,
	UploadCompleteResponseSchema,
	type UploadCompleteBodyType,
	type UploadSignResponseDataType,
	type UploadCompleteResponseDataType,
	type UploadSignResponseType,
	type UploadCompleteResponseType,
};
