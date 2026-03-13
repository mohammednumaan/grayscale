import http from "k6/http";
import { check, fail } from "k6";

const SIGN_URL = "http://localhost:3000/grayscale/api/sign";
const UPLOAD_COMPLETE_URL = "http://localhost:3000/grayscale/upload";

export let options = {
	vus: 100,
	duration: "30s",
};

export default function() {
	const signRes = http.post(SIGN_URL, null);
	const signOk = check(signRes, {
		"sign: status is 200": (r) => r.status === 200,
	});

	if (!signOk) {
		fail("failed to get upload signature");
	}

	const completeRes = http.post(
		UPLOAD_COMPLETE_URL,
		JSON.stringify({
			filename: "test-image.jpg",
			size: 102400,
			file_path: "https://res.cloudinary.com/demo/image/upload/test-image.jpg",
		}),
		{ headers: { "Content-Type": "application/json" } },
	);

	check(completeRes, {
		"complete: status is 200": (r) => r.status === 200,
		"complete: metadata saved": (r) =>
			r.json().message === "File metadata saved successfully",
	});
}
