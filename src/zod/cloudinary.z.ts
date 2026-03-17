import { z } from "zod";

const CloudinaryUploadResponseSchema = z.object({
	secure_url: z.string().url(),
	public_id: z.string(),
	bytes: z.number().int().nonnegative(),
	original_filename: z.string(),
	format: z.string().optional(),
	width: z.number().int().positive().optional(),
	height: z.number().int().positive().optional(),
	resource_type: z.string().optional(),
	created_at: z.string().optional(),
	folder: z.string().optional(),
});

const CloudinaryErrorPayloadSchema = z.object({
	error: z
		.object({
			message: z.string().optional(),
		})
		.optional(),
});

type CloudinaryUploadResponseType = z.infer<typeof CloudinaryUploadResponseSchema>;
type CloudinaryErrorPayloadType = z.infer<typeof CloudinaryErrorPayloadSchema>;

export {
	CloudinaryUploadResponseSchema,
	CloudinaryErrorPayloadSchema,
	type CloudinaryUploadResponseType,
	type CloudinaryErrorPayloadType,
};
