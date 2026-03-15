import express from "express";
import cors from "cors";

import { configDotenv } from "dotenv";
import uploadRouter from "./api/upload.api.js";
import statusRouter from "./api/status.api.js";
import { ExpressAdapter } from "@bull-board/express";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import grayscaleQueue from "./conn/queue.conn.js";

configDotenv();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/admin/queues");

createBullBoard({
	queues: [new BullMQAdapter(grayscaleQueue)],
	serverAdapter
})

app.use("/admin/queues", serverAdapter.getRouter());
app.use('/grayscale/uploads', uploadRouter);
app.use("/grayscale", statusRouter);


app.listen(PORT, () => {
	console.log(`[Process]: Process PID is ${process.pid}`);
	console.log(`[Server]: Running on port ${PORT}`);
	console.log(`[BullMQ]: Available at http://localhost:${PORT}/admin/queues`);
});

