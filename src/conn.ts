import { v2 as cloudinary } from "cloudinary";
import { Queue } from "bullmq";

import pg from "pg";
import env from "./env.js";
import type { RedisOptions } from "ioredis/built/cluster/util.js";

function getRedisConfig(): RedisOptions {
	return {
		host: env.redis.host,
		port: env.redis.port,
		maxRetriesPerRequest: null,
	};
}

cloudinary.config({
	cloud_name: env.cloudinary.cloudName,
	api_key: env.cloudinary.apiKey,
	api_secret: env.cloudinary.apiSecret,
});


const pool = new pg.Pool({
	connectionString: env.databaseUrl,
});


const grayscaleQueue = new Queue("grayscale-queue", {
	connection: getRedisConfig(),
});


export {
	cloudinary,
	pool,
	grayscaleQueue,
	getRedisConfig
}
