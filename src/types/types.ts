interface FileMetadata {
	id: number;
	filename: string;
	size: number;
	uploaded_at: Date;
	updated_at: Date;
	file_path: string;
}

interface FileJobs {
	id: number;
	file_id: number;
	status: "pending" | "processing" | "completed" | "failed";
	created_at: Date;
	updated_at: Date;
}

interface FileJobData {
	jobId: number;
	filePath: string;
}

export { type FileMetadata, type FileJobs, type FileJobData };
