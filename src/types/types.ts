interface FileMetadataType {
  id: number;
  filename: string;
  size: number;
  uploaded_at: Date;
  updated_at: Date;
  file_path: string;
}

interface FileJobsType {
  id: number;
  file_id: number;
  status: "pending" | "processing" | "completed" | "failed";
  created_at: Date;
  updated_at: Date;
}

interface FileJobDataType {
  jobId: number;
  fileKey: string;
}

export { type FileMetadataType, type FileJobsType, type FileJobDataType };
