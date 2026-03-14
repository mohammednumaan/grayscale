import http from "k6/http";
import { check, fail } from "k6";

const testImage = open("./image.jpg", "b");

const SIGN_URL = "http://localhost:3000/grayscale/api/sign";
const UPLOAD_COMPLETE_URL = "http://localhost:3000/grayscale/upload";

export let options = {
	vus: 10,
	duration: "10s",
	thresholds: {
		"http_req_duration{name:sign}": ["p(95)<500"],
		"http_req_duration{name:upload_complete}": ["p(95)<500"],
	},
};

export default function() {
	const signRes = http.post(SIGN_URL, null, { tags: { name: "sign" } });
	const signOk = check(signRes, {
		"sign: status is 200": (r) => r.status === 200,
	});

	if (!signOk) {
		fail("failed to get upload signature");
	}

	const signData = signRes.json();

	const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${signData.cloud_name}/image/upload`;

	const cloudinaryRes = http.post(
		cloudinaryUrl,
		{
			file: http.file(testImage, "test_image.jpg", "image/jpeg"),
			api_key: signData.api_key,
			timestamp: signData.timestamp,
			signature: signData.signature,
			public_id: signData.public_id,
			folder: signData.folder,
		},
		{ tags: { name: "cloudinary_upload" } },
	);

	const cloudinaryOk = check(cloudinaryRes, {
		"cloudinary: status is 200": (r) => r.status === 200,
	});

	if (!cloudinaryOk) {
		fail("failed to upload to cloudinary");
	}

	const cloudinaryData = cloudinaryRes.json();

	const completeRes = http.post(
		UPLOAD_COMPLETE_URL,
		JSON.stringify({
			filename: cloudinaryData.original_filename,
			size: cloudinaryData.bytes,
			file_path: cloudinaryData.secure_url,
		}),
		{
			headers: { "Content-Type": "application/json" },
			tags: { name: "upload_complete" },
		},
	);

	check(completeRes, {
		"complete: status is 200": (r) => r.status === 200,
		"complete: metadata saved": (r) =>
			r.json().message === "File metadata saved successfully",
	});
}
