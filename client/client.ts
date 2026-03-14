const SIGN_URL = "http://localhost:3000/grayscale/api/sign";
const UPLOAD_COMPLETE_URL = "http://localhost:3000/grayscale/upload";
const STATUS_URL = "http://localhost:3000/grayscale/status";

const POLL_INTERVAL_MS = 2000;

const form = document.getElementById("upload-form") as HTMLFormElement;
const fileInput = document.getElementById("file-input") as HTMLInputElement;
const fileNameEl = document.getElementById("file-name") as HTMLSpanElement;
const uploadBtn = document.getElementById("upload-btn") as HTMLButtonElement;
const statusEl = document.getElementById("status") as HTMLParagraphElement;
const placeholderEl = document.getElementById("placeholder") as HTMLDivElement;
const panelRight = document.getElementById("panel-right") as HTMLDivElement;
const previewContainer = document.getElementById("preview-container") as HTMLDivElement;
const previewImage = document.getElementById("preview-image") as HTMLImageElement;

interface SignResponse {
	signature: string;
	public_id: string;
	folder: string;
	timestamp: number;
	cloud_name: string;
	api_key: string;
}

interface CloudinaryUploadResponse {
	secure_url: string;
	public_id: string;
	bytes: number;
	original_filename: string;
}

interface UploadCompleteResponse {
	message: string;
	filename: string;
	jobId: number;
}

interface StatusResponse {
	jobId: number;
	status: "pending" | "processing" | "completed" | "failed";
	processedUrl: string | null;
	filename: string | null;
}

function setStatus(message: string, type: "success" | "error" | "") {
	statusEl.textContent = message;
	statusEl.className = type;
}

function showProcessedImage(url: string) {
	placeholderEl.classList.add("hidden");

	const existing = panelRight.querySelector(".result-image");
	if (existing) existing.remove();

	const img = document.createElement("img");
	img.src = url;
	img.alt = "Grayscale result";
	img.className = "result-image";
	panelRight.appendChild(img);
}

function resetRightPanel() {
	const existing = panelRight.querySelector(".result-image");
	if (existing) existing.remove();
	placeholderEl.classList.remove("hidden");
}

async function pollForResult(jobId: number): Promise<void> {
	setStatus("Processing image...", "");
	statusEl.classList.add("processing");

	return new Promise((resolve, reject) => {
		const interval = setInterval(async () => {
			try {
				const res = await fetch(`${STATUS_URL}/${jobId}`);
				if (!res.ok) {
					clearInterval(interval);
					reject(new Error(`Status check failed (${res.status})`));
					return;
				}

				const data: StatusResponse = await res.json();

				if (data.status === "completed" && data.processedUrl) {
					clearInterval(interval);
					showProcessedImage(data.processedUrl);
					setStatus("Processing complete!", "success");
					statusEl.classList.remove("processing");
					resolve();
				} else if (data.status === "failed") {
					clearInterval(interval);
					statusEl.classList.remove("processing");
					reject(new Error("Image processing failed on the server"));
				}
			} catch (err) {
				clearInterval(interval);
				statusEl.classList.remove("processing");
				reject(err);
			}
		}, POLL_INTERVAL_MS);
	});
}

fileInput.addEventListener("change", () => {
	const file = fileInput.files?.[0];
	fileNameEl.textContent = file ? file.name : "No file selected";

	if (file) {
		if (previewImage.src) URL.revokeObjectURL(previewImage.src);
		previewImage.src = URL.createObjectURL(file);
		previewContainer.classList.remove("hidden");
	} else {
		previewContainer.classList.add("hidden");
		previewImage.src = "";
	}
});

form.addEventListener("submit", async (e: Event) => {
	e.preventDefault();

	const files = fileInput.files;
	if (!files || files.length === 0) {
		setStatus("Please select a file first.", "error");
		return;
	}

	const file = files[0]!;

	uploadBtn.disabled = true;
	setStatus("Uploading...", "");
	resetRightPanel();

	try {
		const signRes = await fetch(SIGN_URL, { method: "POST" });
		if (!signRes.ok) {
			const text = await signRes.text();
			throw new Error(
				`Failed to get upload signature (${signRes.status}): ${text}`,
			);
		}
		const signData: SignResponse = await signRes.json();

		const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${signData.cloud_name}/image/upload`;

		const formData = new FormData();
		formData.append("file", file);
		formData.append("api_key", signData.api_key);
		formData.append("timestamp", String(signData.timestamp));
		formData.append("signature", signData.signature);
		formData.append("public_id", signData.public_id);
		formData.append("folder", signData.folder);

		const uploadRes = await fetch(cloudinaryUrl, {
			method: "POST",
			body: formData,
		});

		if (!uploadRes.ok) {
			const text = await uploadRes.text();
			throw new Error(
				`Cloudinary upload failed (${uploadRes.status}): ${text}`,
			);
		}

		const uploadData: CloudinaryUploadResponse = await uploadRes.json();

		const completeRes = await fetch(UPLOAD_COMPLETE_URL, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				filename: file.name,
				size: uploadData.bytes,
				file_path: uploadData.secure_url,
			}),
		});

		if (!completeRes.ok) {
			const text = await completeRes.text();
			throw new Error(
				`Failed to save metadata (${completeRes.status}): ${text}`,
			);
		}

		const completeData: UploadCompleteResponse = await completeRes.json();

		setStatus("Upload successful! Waiting for processing...", "success");

		await pollForResult(completeData.jobId);
	} catch (err) {
		const message = err instanceof Error ? err.message : "Unknown error";
		setStatus(`Error: ${message}`, "error");
	} finally {
		uploadBtn.disabled = false;
	}
});
