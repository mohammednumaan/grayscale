const SIGN_URL = "http://localhost:3000/grayscale/uploads/sign";
const UPLOAD_COMPLETE_URL = "http://localhost:3000/grayscale/uploads/complete";
const STATUS_URL = "http://localhost:3000/grayscale/status";

const POLL_INTERVAL_MS = 2000;

// DOM Elements
const form = document.getElementById("upload-form") as HTMLFormElement;
const fileInput = document.getElementById("file-input") as HTMLInputElement;
const dropzone = document.getElementById("dropzone") as HTMLDivElement;
const selectFileBtn = document.getElementById("select-file-btn") as HTMLButtonElement;
const fileNameEl = document.getElementById("file-name") as HTMLDivElement;
const fileSizeEl = document.getElementById("file-size") as HTMLDivElement;
const changeFileBtn = document.getElementById("change-file-btn") as HTMLButtonElement;
const uploadBtn = document.getElementById("upload-btn") as HTMLButtonElement;
const statusEl = document.getElementById("status") as HTMLSpanElement;

const comparisonSection = document.getElementById("comparison") as HTMLElement;
const previewImage = document.getElementById("preview-image") as HTMLImageElement;
const resultBody = document.getElementById("result-body") as HTMLDivElement;
const processingIndicator = document.getElementById("processing-indicator") as HTMLDivElement;

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

function setStatus(message: string, type: "success" | "error" | "processing" | "") {
	statusEl.textContent = message;
	statusEl.className = type;
}

function formatBytes(bytes: number, decimals = 2) {
	if (bytes === 0) return "0 Bytes";
	const k = 1024;
	const dm = decimals < 0 ? 0 : decimals;
	const sizes = ["Bytes", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

function handleFileSelect(file: File) {
	if (!file.type.startsWith("image/")) {
		setStatus("Please select an image file.", "error");
		return;
	}

	// Update UI to show selected file
	fileNameEl.textContent = file.name;
	fileSizeEl.textContent = formatBytes(file.size);
	dropzone.classList.add("has-file");

	// Show original preview
	if (previewImage.src) {
		URL.revokeObjectURL(previewImage.src);
	}
	previewImage.src = URL.createObjectURL(file);
	comparisonSection.classList.add("visible");

	// Reset result panel
	resetResultPanel();
	setStatus("", "");
}

function resetResultPanel() {
	const existingImg = resultBody.querySelector("img");
	if (existingImg) existingImg.remove();
	processingIndicator.classList.remove("active");
}

function showProcessing() {
	resetResultPanel();
	processingIndicator.classList.add("active");
	setStatus("Processing image...", "processing");
}

function showResult(url: string) {
	processingIndicator.classList.remove("active");
	const img = document.createElement("img");
	img.src = url;
	img.alt = "Grayscale result";
	resultBody.appendChild(img);
	setStatus("Conversion successful!", "success");
}

// Event Listeners

// Drag & Drop
dropzone.addEventListener("dragover", (e) => {
	e.preventDefault();
	dropzone.classList.add("dragover");
});

dropzone.addEventListener("dragleave", () => {
	dropzone.classList.remove("dragover");
});

dropzone.addEventListener("drop", (e) => {
	e.preventDefault();
	dropzone.classList.remove("dragover");
	const files = e.dataTransfer?.files;
	if (files && files.length > 0) {
		fileInput.files = files;
		handleFileSelect(files[0]);
	}
});

// Click on dropzone or select button to select file
dropzone.addEventListener("click", (e) => {
	const target = e.target as HTMLElement;
	if (target === changeFileBtn || target === selectFileBtn || target === dropzone || dropzone.contains(target)) {
		if (target !== changeFileBtn) {
			fileInput.click();
		}
	}
});

selectFileBtn.addEventListener("click", (e) => {
	e.stopPropagation();
	fileInput.click();
});

changeFileBtn.addEventListener("click", (e) => {
	e.stopPropagation();
	fileInput.click();
});

fileInput.addEventListener("change", () => {
	const file = fileInput.files?.[0];
	if (file) {
		handleFileSelect(file);
	}
});

// Form Submission
form.addEventListener("submit", async (e: Event) => {
	e.preventDefault();

	const files = fileInput.files;
	if (!files || files.length === 0) {
		setStatus("Select an image first", "error");
		return;
	}

	const file = files[0]!;
	uploadBtn.disabled = true;
	showProcessing();

	try {
		// 1. Get Signature
		const signRes = await fetch(SIGN_URL);
		if (!signRes.ok) {
			throw new Error("Failed to get upload signature");
		}
		const signData: SignResponse = await signRes.json();

		// 2. Upload to Cloudinary
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
			throw new Error("Cloudinary upload failed");
		}
		const uploadData: CloudinaryUploadResponse = await uploadRes.json();

		// 3. Notify Backend
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
			throw new Error("Failed to start processing");
		}
		const completeData: UploadCompleteResponse = await completeRes.json();

		// 4. Poll for Result
		await pollForResult(completeData.jobId);

	} catch (err) {
		const message = err instanceof Error ? err.message : "Conversion failed";
		setStatus(message, "error");
		processingIndicator.classList.remove("active");
	} finally {
		uploadBtn.disabled = false;
	}
});

async function pollForResult(jobId: number): Promise<void> {
	return new Promise((resolve, reject) => {
		const interval = setInterval(async () => {
			try {
				const res = await fetch(`${STATUS_URL}/${jobId}`);
				if (!res.ok) {
					clearInterval(interval);
					reject(new Error("Status check failed"));
					return;
				}

				const data: StatusResponse = await res.json();

				if (data.status === "completed" && data.processedUrl) {
					clearInterval(interval);
					showResult(data.processedUrl);
					resolve();
				} else if (data.status === "failed") {
					clearInterval(interval);
					reject(new Error("Processing failed on server"));
				}
			} catch (err) {
				clearInterval(interval);
				reject(err);
			}
		}, POLL_INTERVAL_MS);
	});
}
