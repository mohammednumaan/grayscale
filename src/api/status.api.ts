import { Router } from "express";
import { getFileJobById } from "../db/query.db.js";
import { getFileMetadataById } from "../db/query.db.js";

const router = Router();

router.get("/status/:jobId", async (req, res) => {
    const jobId = Number(req.params.jobId);

    if (Number.isNaN(jobId)) {
        return res.status(400).json({ error: "Invalid job ID" });
    }

    try {
        const job = await getFileJobById(jobId);

        if (!job) {
            return res.status(404).json({ error: "Job not found" });
        }

        const response: Record<string, unknown> = {
            jobId: job.id,
            status: job.status,
            processedUrl: null,
            filename: null,
        };

        if (job.status === "completed") {
            const metadata = await getFileMetadataById(job.file_id);
            if (metadata) {
                response.processedUrl = metadata.file_path;
                response.filename = metadata.filename;
            }
        }

        return res.json(response);
    } catch (error) {
        console.error("Error fetching job status:", error);
        return res.status(500).json({ error: "Failed to fetch job status" });
    }
});

export default router;
