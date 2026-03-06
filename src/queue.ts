import { Queue } from "bullmq";
const grayscaleQueue = new Queue("grayscale-queue");
export default grayscaleQueue;
