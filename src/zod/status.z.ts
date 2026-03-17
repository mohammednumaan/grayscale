import { z } from "zod";
import { createApiResponseSchema } from "./api-response.z.js";

const JobStatusParamsSchema = z.object({
	jobId: z.coerce.number().int().positive("jobId must be a positive integer"),
});

const JobStatusResponseDataSchema = z.object({
	jobId: z.number().int().positive(),
	status: z.enum(["pending", "processing", "completed", "failed"]),
	processedUrl: z.string().url().nullable(),
	filename: z.string().nullable(),
});

const JobStatusResponseSchema = createApiResponseSchema(
	JobStatusResponseDataSchema,
);

type JobStatusParamsType = z.infer<typeof JobStatusParamsSchema>;
type JobStatusResponseDataType = z.infer<typeof JobStatusResponseDataSchema>;
type JobStatusResponseType = z.infer<typeof JobStatusResponseSchema>;

export {
	JobStatusParamsSchema,
	JobStatusResponseDataSchema,
	JobStatusResponseSchema,
	type JobStatusParamsType,
	type JobStatusResponseDataType,
	type JobStatusResponseType,
};
