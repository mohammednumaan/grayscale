import express, { type Request, type Response } from "express";
import cors from 'cors';
import { configDotenv } from 'dotenv';

configDotenv();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req: Request, res: Response) => {
	res.json({ message: "hello grayscale!" });
})

app.listen(PORT, () => {
	console.log(`[Server]: Running on port ${PORT}`);
});
