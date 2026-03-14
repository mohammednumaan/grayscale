import pool from "../conn/pg.conn.js";
import type { FileMetadata, FileJobs } from "../types/types.js";

async function insertFileMetadata(
	data: Omit<FileMetadata, "id" | "uploaded_at" | "updated_at">,
): Promise<FileMetadata> {
	const { rows } = await pool.query(
		`INSERT INTO file_metadata (filename, size, file_path)
		 VALUES ($1, $2, $3)
		 RETURNING *`,
		[data.filename, data.size, data.file_path],
	);
	return rows[0] as FileMetadata;
}

async function getFileMetadataById(id: number): Promise<FileMetadata | null> {
	const { rows } = await pool.query(
		`SELECT * FROM file_metadata WHERE id = $1`,
		[id],
	);
	return (rows[0] as FileMetadata) ?? null;
}

async function getAllFileMetadata(): Promise<FileMetadata[]> {
	const { rows } = await pool.query(`SELECT * FROM file_metadata`);
	return rows as FileMetadata[];
}

async function updateFileMetadata(file_path: string, id: number): Promise<FileMetadata> {
	const { rows } = await pool.query(
		`UPDATE file_metadata SET file_path = $1, updated_at = NOW()
		 WHERE id = (SELECT file_id FROM file_jobs WHERE id = $2)
		 RETURNING *`,
		[file_path, id],
	);

	return rows[0] as FileMetadata;
}

async function deleteFileMetadata(id: number): Promise<boolean> {
	const { rowCount } = await pool.query(
		`DELETE FROM file_metadata WHERE id = $1`,
		[id],
	);
	return (rowCount ?? 0) > 0;
}

async function insertFileJob(
	data: Omit<FileJobs, "id" | "created_at" | "updated_at">,
): Promise<FileJobs> {
	const { rows } = await pool.query(
		`INSERT INTO file_jobs (file_id, status)
		 VALUES ($1, $2)
		 RETURNING *`,
		[data.file_id, data.status],
	);
	return rows[0] as FileJobs;
}

async function getFileJobById(id: number): Promise<FileJobs | null> {
	const { rows } = await pool.query(`SELECT * FROM file_jobs WHERE id = $1`, [
		id,
	]);
	return (rows[0] as FileJobs) ?? null;
}

async function getFileJobsByFileId(fileId: number): Promise<FileJobs[]> {
	const { rows } = await pool.query(
		`SELECT * FROM file_jobs WHERE file_id = $1`,
		[fileId],
	);
	return rows as FileJobs[];
}

async function updateFileJobStatus(
	id: number,
	status: FileJobs["status"],
): Promise<FileJobs | null> {
	const { rows } = await pool.query(
		`UPDATE file_jobs SET status = $1, updated_at = NOW()
		 WHERE id = $2
		 RETURNING *`,
		[status, id],
	);
	return (rows[0] as FileJobs) ?? null;
}

async function deleteFileJob(id: number): Promise<boolean> {
	const { rowCount } = await pool.query(`DELETE FROM file_jobs WHERE id = $1`, [
		id,
	]);
	return (rowCount ?? 0) > 0;
}

export {
	insertFileMetadata,
	getFileMetadataById,
	getAllFileMetadata,
	updateFileMetadata,
	deleteFileMetadata,
	insertFileJob,
	getFileJobById,
	getFileJobsByFileId,
	updateFileJobStatus,
	deleteFileJob,
};
