import pool from "../conn/pg.conn.js";
import type { FileMetadataType, FileJobsType } from "../types/types.js";

async function insertFileMetadata(
	data: Omit<FileMetadataType, "id" | "uploaded_at" | "updated_at">,
): Promise<FileMetadataType> {
	const { rows } = await pool.query(
		`INSERT INTO file_metadata (filename, size, file_path)
		 VALUES ($1, $2, $3)
		 RETURNING *`,
		[data.filename, data.size, data.file_path],
	);
	return rows[0] as FileMetadataType;
}

async function getFileMetadataById(id: number): Promise<FileMetadataType | null> {
	const { rows } = await pool.query(
		`SELECT * FROM file_metadata WHERE id = $1`,
		[id],
	);
	return (rows[0] as FileMetadataType) ?? null;
}

async function updateFileMetadata(file_path: string, id: number): Promise<FileMetadataType> {
	const { rows } = await pool.query(
		`UPDATE file_metadata SET file_path = $1, updated_at = NOW()
		 WHERE id = (SELECT file_id FROM file_jobs WHERE id = $2)
		 RETURNING *`,
		[file_path, id],
	);

	return rows[0] as FileMetadataType;
}

async function insertFileJob(
	data: Omit<FileJobsType, "id" | "created_at" | "updated_at">,
): Promise<FileJobsType> {
	const { rows } = await pool.query(
		`INSERT INTO file_jobs (file_id, status)
		 VALUES ($1, $2)
		 RETURNING *`,
		[data.file_id, data.status],
	);
	return rows[0] as FileJobsType;
}

async function getFileJobById(id: number): Promise<FileJobsType | null> {
	const { rows } = await pool.query(`SELECT * FROM file_jobs WHERE id = $1`, [
		id,
	]);
	return (rows[0] as FileJobsType) ?? null;
}

async function updateFileJobStatus(
	id: number,
	status: FileJobsType["status"],
): Promise<FileJobsType | null> {
	const { rows } = await pool.query(
		`UPDATE file_jobs SET status = $1, updated_at = NOW()
		 WHERE id = $2
		 RETURNING *`,
		[status, id],
	);
	return (rows[0] as FileJobsType) ?? null;
}

export {
	insertFileMetadata,
	getFileMetadataById,
	updateFileMetadata,
	insertFileJob,
	getFileJobById,
	updateFileJobStatus,
};
