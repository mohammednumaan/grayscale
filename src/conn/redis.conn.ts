import type { RedisOptions } from "ioredis";
import env from "../env.js";

function getRedisConfig(): RedisOptions {
	return {
		host: env.redis.host,
		port: env.redis.port,
		password: env.redis.password,
		maxRetriesPerRequest: null,
	};
}

export { getRedisConfig };
