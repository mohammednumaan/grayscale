import { Queue } from "bullmq";
import { getRedisConfig } from "./redis.conn.js";

const grayscaleQueue = new Queue("grayscale-queue", {
	connection: getRedisConfig(),
});

export default grayscaleQueue;
