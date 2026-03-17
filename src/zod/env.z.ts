import { z } from "zod";

const EnvSchema = z.object({
	PORT: z.coerce.number().default(3000),
	DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
	CLOUDINARY_CLOUD_NAME: z.string().min(1, "CLOUDINARY_CLOUD_NAME is required"),
	CLOUDINARY_API_KEY: z.string().min(1, "CLOUDINARY_API_KEY is required"),
	CLOUDINARY_API_SECRET: z.string().min(1, "CLOUDINARY_API_SECRET is required"),
	REDIS_HOST: z.string().default("127.0.0.1"),
	REDIS_PORT: z.coerce.number().default(6379),
	REDIS_PASSWORD: z.string().optional(),
});

type EnvType = z.infer<typeof EnvSchema>;

export { EnvSchema, type EnvType };
