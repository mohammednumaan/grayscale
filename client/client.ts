const SIGN_URL = "http://localhost:3000/grayscale/uploads/sign";
const UPLOAD_NOTIFY_URL = "http://localhost:3000/grayscale/uploads/notify";
const STATUS_URL = "http://localhost:3000/grayscale/jobs/status";

const POLL_INTERVAL_MS = 2000;

// DOM Elements
const form = document.getElementById("upload-form") as HTMLFormElement;
const fileInput = document.getElementById("file-input") as HTMLInputElement;
const dropzone = document.getElementById("dropzone") as HTMLDivElement;
const fileNameEl = document.getElementById("file-name") as HTMLDivElement;
const fileSizeEl = document.getElementById("file-size") as HTMLDivElement;
const changeFileBtn = document.getElementById(
  "change-file-btn",
) as HTMLButtonElement;
const uploadBtn = document.getElementById("upload-btn") as HTMLButtonElement;

const statusArea = document.getElementById("status-area") as HTMLDivElement;
const statusTitle = document.getElementById("status-title") as HTMLDivElement;
const statusText = document.getElementById("status-text") as HTMLDivElement;

const displayPlaceholder = document.getElementById(
  "display-placeholder",
) as HTMLDivElement;
const comparisonSection = document.getElementById("comparison") as HTMLElement;
const previewImage = document.getElementById(
  "preview-image",
) as HTMLImageElement;
const resultBody = document.getElementById("result-body") as HTMLDivElement;
const processingIndicator = document.getElementById(
  "processing-indicator",
) as HTMLDivElement;
const downloadContainer = document.getElementById(
  "download-container",
) as HTMLDivElement;
const downloadLink = document.getElementById(
  "download-link",
) as HTMLAnchorElement;

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

interface CloudinaryErrorPayload {
  error?: {
    message?: string;
  };
}

interface UploadCompleteResponse {
  filename: string;
  jobId: number;
}

interface StatusResponse {
  jobId: number;
  publicId: string;
  status: "pending" | "processing" | "completed" | "failed";
  processedUrl: string | null;
  originalUrl: string;
  filename: string;
}

interface ApiErrorResponse {
  code: string;
  description?: unknown;
}

interface ApiResponse<T> {
  message: string;
  statusCode: number;
  success: boolean;
  data?: T;
  error?: ApiErrorResponse;
}

// Status System
function updateButtonStates() {
  const hasFile = fileInput.files && fileInput.files.length > 0;
  uploadBtn.disabled = !hasFile;
  // Change button is usually enabled once a file is selected or on idle
  changeFileBtn.disabled = false;
}

function setStatus(
  title: string,
  text: string,
  type: "processing" | "success" | "error" | "idle",
) {
  if (type === "idle") {
    statusTitle.textContent = "Ready";
    statusTitle.className = "status-value";
    statusText.textContent = "Awaiting image selection...";
    statusText.style.display = "block";
    statusText.style.marginTop = "0.5rem";
    return;
  }

  statusTitle.textContent = title;
  statusTitle.className = `status-value ${type}`;

  if (text && text.trim().length > 0) {
    statusText.textContent = text;
    statusText.style.display = "block";
    statusText.style.marginTop = "0.5rem";
  } else {
    statusText.style.display = "none";
    statusText.style.marginTop = "0";
  }
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
    // Replace toast with status error
    setStatus("INVALID FILE", "Please select a valid image file.", "error");
    return;
  }

  // Update UI
  fileNameEl.textContent = file.name;
  fileSizeEl.textContent = formatBytes(file.size);
  dropzone.classList.add("has-file");

  // Display region
  displayPlaceholder.style.display = "none";
  comparisonSection.classList.add("visible");

  if (previewImage.src) URL.revokeObjectURL(previewImage.src);
  previewImage.src = URL.createObjectURL(file);

  // Reset
  resetResultPanel();
  setStatus("", "", "idle");
  updateButtonStates();
}

function resetResultPanel() {
  resultBody.innerHTML = "";
  processingIndicator.classList.remove("active");
  downloadContainer.style.display = "none";
}

function showProcessing() {
  resetResultPanel();
  processingIndicator.classList.add("active");
  comparisonSection.classList.add("visible");
  displayPlaceholder.style.display = "none";
  setStatus("PROCESSING", "Initializing...", "processing");
  uploadBtn.disabled = true;
  changeFileBtn.disabled = true;
}

function showResult(url: string) {
  processingIndicator.classList.remove("active");
  comparisonSection.classList.add("visible");
  const img = document.createElement("img");
  img.src = url;
  img.alt = "Grayscale result";
  resultBody.appendChild(img);

  // Setup download link
  downloadLink.href = url;
  downloadLink.download = "grayscale-image.png";
  downloadContainer.style.display = "block";

  setStatus("SUCCESS", "Image processed successfully.", "success");
  uploadBtn.disabled = false;
  changeFileBtn.disabled = false;
}

function extractApiErrorMessage(error: ApiResponse<unknown>, fallback: string) {
  if (
    typeof error.error?.description === "string" &&
    error.error.description.length > 0
  ) {
    return error.error.description;
  }

  return error.message || fallback;
}

async function readApiResponse<T>(
  response: Response,
  fallbackMessage: string,
): Promise<T> {
  const payload = (await response.json()) as ApiResponse<T>;

  if (!response.ok || !payload.success) {
    throw new Error(extractApiErrorMessage(payload, fallbackMessage));
  }

  if (payload.data === undefined) {
    // Some endpoints might return success without data
    return {} as T;
  }

  return payload.data;
}

async function readCloudinaryError(
  response: Response,
  fallbackMessage: string,
) {
  try {
    const payload = (await response.json()) as CloudinaryErrorPayload;
    return payload.error?.message || fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}

// Event Listeners

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
  if (files && files.length > 0 && files[0]) {
    fileInput.files = files;
    handleFileSelect(files[0]);
  }
});

dropzone.addEventListener("click", (e) => {
  const target = e.target as HTMLElement;
  if (target === changeFileBtn || changeFileBtn.contains(target)) return;
  fileInput.click();
});

changeFileBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  fileInput.click();
});

fileInput.addEventListener("change", () => {
  const file = fileInput.files?.[0];
  if (file) handleFileSelect(file);
});

form.addEventListener("submit", async (e: Event) => {
  e.preventDefault();

  const files = fileInput.files;
  if (!files || files.length === 0) {
    setStatus("ERROR", "No file selected.", "error");
    uploadBtn.disabled = true;
    return;
  }

  const file = files[0]!;
  uploadBtn.disabled = true;
  showProcessing();

  try {
    // 1. Get Signature
    setStatus("PROCESSING", "Securing connection...", "processing");
    const signRes = await fetch(SIGN_URL);
    const signData = await readApiResponse<SignResponse>(
      signRes,
      "SIGNATURE ERROR",
    );

    // 2. Upload to Cloudinary
    setStatus("PROCESSING", "Uploading to Cloudinary...", "processing");
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
      throw new Error(await readCloudinaryError(uploadRes, "UPLOAD FAILED"));
    }
    const uploadData: CloudinaryUploadResponse = await uploadRes.json();

    // 3. Notify Backend
    setStatus("PROCESSING", "Starting conversion...", "processing");
    const notifyRes = await fetch(UPLOAD_NOTIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(uploadData),
    });

    const notifyData = await readApiResponse<UploadCompleteResponse>(
      notifyRes,
      "HANDSHAKE FAILED",
    );
    setStatus("PROCESSING", "Polling for result...", "processing");

    // 4. Poll for Result
    await pollForResult(notifyData.jobId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "PROCESS FAILED";
    setStatus("ERROR", message.toUpperCase(), "error");
    processingIndicator.classList.remove("active");
    // Keep comparison visible if we have a preview, only show placeholder if no preview
    if (!previewImage.src) {
      displayPlaceholder.style.display = "block";
      comparisonSection.classList.remove("visible");
    }
  } finally {
    updateButtonStates();
  }
});

// Initial State
updateButtonStates();

async function pollForResult(jobId: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${STATUS_URL}/${jobId}`);
        if (!res.ok) {
          clearInterval(interval);
          const errorPayload =
            (await res.json()) as ApiResponse<StatusResponse>;
          reject(new Error(extractApiErrorMessage(errorPayload, "POLL ERROR")));
          return;
        }

        const data = await readApiResponse<StatusResponse>(res, "POLL ERROR");

        if (data.status === "completed" && data.processedUrl) {
          clearInterval(interval);
          showResult(data.processedUrl);
          resolve();
        } else if (data.status === "failed") {
          clearInterval(interval);
          reject(new Error("SYSTEM FAILURE"));
        } else {
          setStatus(
            "PROCESSING",
            `JOB ID ${data.jobId} / ${data.status.toUpperCase()}`,
            "processing",
          );
        }
      } catch (err) {
        clearInterval(interval);
        reject(err);
      }
    }, POLL_INTERVAL_MS);
  });
}
