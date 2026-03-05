import express, { type Request, type Response } from "express";
import cors from 'cors';
import multer from 'multer';
import { configDotenv } from 'dotenv';

configDotenv();
const app = express();
const PORT = process.env.PORT || 3000;
const upload = multer({ dest: 'uploads/' });

app.use(cors());
app.use(express.json());

app.get('/', (req: Request, res: Response) => {
	res.json({ message: "hello grayscale!" });
})

app.post('/grayscale/upload', upload.single('image'), (req: Request, res: Response) => {
	if (!req.file) {
		return res.status(400).json({ error: "No file uploaded" });
	}

	// TODO: here, i need to queue this image into a task queue for processing it into a grayscale image.

	res.json({ message: "File uploaded successfully", filename: req.file.filename });
});


app.listen(PORT, () => {
	console.log(`[Server]: Running on port ${PORT}`);
});
