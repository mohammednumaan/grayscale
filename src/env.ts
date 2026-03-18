import { configDotenv } from "dotenv";

configDotenv();

const env = {
	port: Number(process.env.PORT ?? 3000),
	databaseUrl: process.env.DATABASE_URL,
	s3: {
		region: process.env.AWS_REGION ?? "us-east-1",
		bucket: process.env.AWS_S3_BUCKET ?? "grayscale-tool",
		accessKeyId: process.env.AWS_ACCESS_KEY_ID,
		secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
	},
	redis: {
		host: process.env.REDIS_HOST ?? "127.0.0.1",
		port: Number(process.env.REDIS_PORT ?? 6379),
		password: process.env.REDIS_PASSWORD || undefined,
	},
};

export default env;
