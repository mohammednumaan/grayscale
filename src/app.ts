import express from "express";
import cors from "cors";

import uploadRouter from "./api/upload.api.js";
import statusRouter from "./api/status.api.js";
import { ExpressAdapter } from "@bull-board/express";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import env from "./env.js";
import { grayscaleQueue } from "./conn.js";

const app = express();
const PORT = env.port;

app.use(cors());
app.use(express.json());

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/admin/queues");

createBullBoard({
	queues: [new BullMQAdapter(grayscaleQueue)],
	serverAdapter
});

app.use("/admin/queues", serverAdapter.getRouter());
app.use("/grayscale/uploads", uploadRouter);
app.use("/grayscale/jobs/status", statusRouter);

app.listen(PORT, () => {
	console.log(`[Process]: Process PID is ${process.pid}`);
	console.log(`[Server]: Running on port ${PORT}`);
	console.log(`[BullMQ]: Available at http://localhost:${PORT}/admin/queues`);
});
