const SIGN_URL = "http://localhost:3000/grayscale/api/sign";
const UPLOAD_COMPLETE_URL = "http://localhost:3000/grayscale/upload";

const form = document.getElementById("upload-form") as HTMLFormElement;
const fileInput = document.getElementById("file-input") as HTMLInputElement;
const fileNameEl = document.getElementById("file-name") as HTMLSpanElement;
const uploadBtn = document.getElementById("upload-btn") as HTMLButtonElement;
const statusEl = document.getElementById("status") as HTMLParagraphElement;

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

function setStatus(message: string, type: "success" | "error" | "") {
	statusEl.textContent = message;
	statusEl.className = type;
}

fileInput.addEventListener("change", () => {
	const file = fileInput.files?.[0];
	fileNameEl.textContent = file ? file.name : "No file selected";
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

		setStatus("Upload successful!", "success");
	} catch (err) {
		const message = err instanceof Error ? err.message : "Unknown error";
		setStatus(`Upload failed: ${message}`, "error");
	} finally {
		uploadBtn.disabled = false;
	}
});
