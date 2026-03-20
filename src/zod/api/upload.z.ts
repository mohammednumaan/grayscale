import { z } from "zod";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const SignRequestSchema = z.object({
	signature: z.string(),
	public_id: z.string(),
	folder: z.string(),
	timestamp: z.number().int().positive(),
	cloud_name: z.string(),
	api_key: z.string(),
});

const SignResponseSchema = z.object({
	signature: z.string(),
	public_id: z.string(),
	folder: z.string(),
	timestamp: z.number().int().positive(),
	cloud_name: z.string(),
	api_key: z.string(),
});


const NotifyRequestSchema = z.object({
	secure_url: z.string(),
	public_id: z.string(),
	bytes: z.number().int().nonnegative().max(MAX_FILE_SIZE, `File size must be less than ${MAX_FILE_SIZE} bytes`),
	original_filename: z.string(),
	format: z.string().optional(),
	width: z.number().int().positive().optional(),
	height: z.number().int().positive().optional(),
	resource_type: z.string().optional(),
	created_at: z.string().optional(),
	folder: z.string().optional(),
});

const NotifyResponseSchema = z.object({
	filename: z.string(),
	jobId: z.number().int().positive(),
});


type SignRequestType = z.infer<typeof SignRequestSchema>;
type SignResponseType = z.infer<typeof SignResponseSchema>;

type NotifyRequestType = z.infer<typeof NotifyRequestSchema>;
type NotifyResponseType = z.infer<typeof NotifyResponseSchema>;


export {
	SignRequestSchema,
	SignResponseSchema,
	NotifyRequestSchema,
	NotifyResponseSchema,
	type SignRequestType,
	type SignResponseType,
	type NotifyRequestType,
	type NotifyResponseType,
}

