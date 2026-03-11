import { type StorageEngine } from "multer";
import { type Request } from "express"
import cloudinary from "../conn/cloudinary.conn.js";

class CloudinaryStorageEngine implements StorageEngine {
	_handleFile(req: Request, file: Express.Multer.File, callback: (error?: any, info?: Partial<Express.Multer.File>) => void): void {
		const uploadStream = cloudinary.uploader.upload_stream(
			{
				folder: "uploads",
				resource_type: "image"
			},
			(error, result) => {
				if (error) return callback(error);
				const cloudinaryUploadResult = {
					path: result?.secure_url,
					size: result?.bytes,
					filename: result?.public_id
				}
				callback(null, cloudinaryUploadResult);
			}
		)

		file.stream.pipe(uploadStream);
	}

	async _removeFile(req: Request, file: Express.Multer.File, callback: (error: Error | null) => void) {
		cloudinary.uploader.destroy(file.filename, (err) => {
			callback(err || null);
		})
	}
}

export default CloudinaryStorageEngine;
