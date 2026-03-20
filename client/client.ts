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
const downloadLink = document.getElementById("download-link") as HTMLAnchorElement;

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
    setStatus("INVALID FILE", "Please select a valid image file.", "error");
    return;
  }

  fileNameEl.textContent = file.name;
  fileSizeEl.textContent = formatBytes(file.size);
  dropzone.classList.add("has-file");
  displayPlaceholder.style.display = "none";
  comparisonSection.classList.add("visible");

  if (previewImage.src) URL.revokeObjectURL(previewImage.src);
  previewImage.src = URL.createObjectURL(file);

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

  // Inject Modern Skeleton
  const skeleton = document.createElement("div");
  skeleton.className = "skeleton-loader";
  skeleton.id = "active-skeleton";

  // SVG Icon inside skeleton
  skeleton.innerHTML = `
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="18" stroke="#333" stroke-width="2" />
      <circle cx="20" cy="20" r="18" stroke="white" stroke-width="2" stroke-dasharray="100" stroke-dashoffset="70" style="animation: spin 1.5s linear infinite" />
    </svg>
    <style>
      @keyframes spin { from { stroke-dashoffset: 100; } to { stroke-dashoffset: -100; } }
    </style>
  `;

  resultBody.appendChild(skeleton);

  processingIndicator.classList.add("active");
  comparisonSection.classList.add("visible");
  displayPlaceholder.style.display = "none";
  setStatus("PROCESSING", "Analyzing image assets...", "processing");
  uploadBtn.disabled = true;
}

function showResult(url: string) {
  console.log("[Reveal] Beginning sophisticated image reveal flow");

  // 1. Prefetch Image
  const img = new Image();
  img.src = url;
  img.onload = () => {
    const resultImg = document.createElement("img");
    resultImg.src = url;
    resultImg.className = "reveal-image";
    resultImg.alt = "Processed image";

    const skeleton = document.getElementById("active-skeleton");

    // 2. Stack and Reveal
    resultBody.appendChild(resultImg);

    // Trigger animations in next frame
    requestAnimationFrame(() => {
      resultImg.classList.add("visible");
      if (skeleton) {
        skeleton.style.opacity = "0";
        skeleton.style.transform = "scale(0.98)";

        // 3. Cleanup after transition
        skeleton.addEventListener("transitionend", () => {
          skeleton.remove();
          console.log("[Reveal] Skeleton removed from DOM");
        }, { once: true });
      }
    });

    setStatus("COMPLETED", "Visual refinement complete.", "success");
    processingIndicator.classList.remove("active");
    downloadLink.href = url;
    downloadLink.download = "grayscale-result.png";
    downloadContainer.style.display = "block";
    uploadBtn.disabled = false;
    changeFileBtn.disabled = false;
  };
}

function showError(message: string) {
  resetResultPanel();
  const errorCont = document.createElement("div");
  errorCont.className = "error-container visible";
  errorCont.innerHTML = `
    <div style="font-size: 2rem; margin-bottom: 0.5rem;">⚠️</div>
    <div style="font-size: 0.9rem; font-weight: 600; margin-bottom: 0.5rem;">${message}</div>
    <button class="btn-action primary" onclick="location.reload()" style="width: auto;">Try Again</button>
  `;
  resultBody.appendChild(errorCont);
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
    console.log("[Upload] Handshake successful, jobId:", notifyData.jobId);
    setStatus("PROCESSING", "Polling for result...", "processing");

    // 4. Poll for Result
    await pollForResult(notifyData.jobId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "PROCESS FAILED";
    showError(message.toUpperCase());
  } finally {
    updateButtonStates();
  }
});

// Initial State
updateButtonStates();

async function pollForResult(jobId: number): Promise<void> {
  console.log("[Polling] Starting for job:", jobId);
  return new Promise((resolve, reject) => {
    const interval = setInterval(async () => {
      try {
        const url = `${STATUS_URL}/${jobId}`;
        console.log("[Polling] Fetching status from:", url);
        const res = await fetch(url);

        if (!res.ok) {
          console.error("[Polling] Fetch failed with status:", res.status);
          clearInterval(interval);
          const errorPayload =
            (await res.json()) as ApiResponse<StatusResponse>;
          reject(new Error(extractApiErrorMessage(errorPayload, "POLL ERROR")));
          return;
        }

        const data = await readApiResponse<StatusResponse>(res, "POLL ERROR");
        console.log("[Polling] Current status:", data.status);

        if (data.status === "completed" && data.processedUrl) {
          console.log("[Polling] Job completed!");
          clearInterval(interval);
          showResult(data.processedUrl);
          resolve();
        } else if (data.status === "failed") {
          console.error("[Polling] Job failed");
          clearInterval(interval);
          reject(new Error("SYSTEM FAILURE"));
        } else {
          const statusMap: Record<string, string> = {
            pending: "Queuing for processing...",
            processing: "Applying grayscale filters...",
          };
          setStatus(
            "REFINING",
            statusMap[data.status] || "Processing...",
            "processing",
          );
        }
      } catch (err) {
        console.error("[Polling] Error during poll:", err);
        clearInterval(interval);
        reject(err);
      }
    }, POLL_INTERVAL_MS);
  });
}
