interface IFileJobs {
	id: number;
	public_id: string;
	filename: string;
	original_file_path: string;
	processed_file_path: string | null;
	status: "pending" | "processing" | "completed" | "failed";
	created_at: Date;
	updated_at: Date;
}

interface IWorkerJob {
	jobId: number;
	originalFilePath: string;
}

export type { IFileJobs, IWorkerJob };
