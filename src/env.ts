import { configDotenv } from "dotenv";

configDotenv();

const env = {
	port: Number(process.env.PORT ?? 3000),
	databaseUrl: process.env.DATABASE_URL,
	cloudinary: {
		cloudName: process.env.CLOUDINARY_CLOUD_NAME,
		apiKey: process.env.CLOUDINARY_API_KEY,
		apiSecret: process.env.CLOUDINARY_API_SECRET,
	},
	redis: {
		host: process.env.REDIS_HOST ?? "127.0.0.1",
		port: Number(process.env.REDIS_PORT ?? 6379),
		password: process.env.REDIS_PASSWORD || undefined,
	},
};

export default env;
