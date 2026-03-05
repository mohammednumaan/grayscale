const API_URL = "http://localhost:3000/grayscale/upload";

const form = document.getElementById("upload-form") as HTMLFormElement;
const fileInput = document.getElementById("file-input") as HTMLInputElement;
const fileNameEl = document.getElementById("file-name") as HTMLSpanElement;
const uploadBtn = document.getElementById("upload-btn") as HTMLButtonElement;
const statusEl = document.getElementById("status") as HTMLParagraphElement;

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

  const formData = new FormData();
  formData.append("image", files[0]!);

  uploadBtn.disabled = true;
  setStatus("Uploading...", "");

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      body: formData,
    });

    if (response.ok) {
      setStatus("Upload successful!", "success");
    } else {
      const text = await response.text();
      setStatus(`Upload failed (${response.status}): ${text}`, "error");
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    setStatus(`Upload failed: ${message}`, "error");
  } finally {
    uploadBtn.disabled = false;
  }
});
