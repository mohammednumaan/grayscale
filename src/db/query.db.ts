import pool from "../conn/pg.conn.js";
import type { FileJobsType } from "../types/types.js";

async function insertFileJob(
  data: Omit<
    FileJobsType,
    "id" | "created_at" | "updated_at" | "processed_file_path"
  >,
): Promise<FileJobsType> {
  const { rows } = await pool.query(
    `INSERT INTO file_jobs (public_id, filename, original_file_path, status)
		 VALUES ($1, $2, $3, $4)
		 RETURNING *`,
    [data.public_id, data.filename, data.original_file_path, data.status],
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

async function updateProcessedFilePath(
  processed_file_path: string,
  id: number,
): Promise<FileJobsType> {
  const { rows } = await pool.query(
    `UPDATE file_jobs SET processed_file_path = $1, updated_at = NOW()
		 WHERE id = $2
		 RETURNING *`,
    [processed_file_path, id],
  );
  return rows[0] as FileJobsType;
}

export {
  insertFileJob,
  getFileJobById,
  updateFileJobStatus,
  updateProcessedFilePath,
};
