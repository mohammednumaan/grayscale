import { z } from "zod";

const JobStatusRequestSchema = z.object({
	jobId: z.coerce.number().int().positive("jobId must be a positive integer"),
});

const JobStatusResponseSchema = z.object({
	jobId: z.number().int().positive(),
	publicId: z.string(),
	status: z.enum(["pending", "processing", "completed", "failed"]),
	processedUrl: z.string().nullable(),
	originalUrl: z.string(),
	filename: z.string(),
});

type JobStatusRequestType = z.infer<typeof JobStatusRequestSchema>;
type JobStatusResponseType = z.infer<typeof JobStatusResponseSchema>;

export {
	JobStatusRequestSchema,
	JobStatusResponseSchema,
	type JobStatusRequestType,
	type JobStatusResponseType,
};
