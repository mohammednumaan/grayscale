import http from 'k6/http'
import { check, fail } from 'k6'

const SIGN_URL = "http://localhost:3000/grayscale/api/sign";
const UPLOAD_COMPLETE_URL = "http://localhost:3000/grayscale/upload";
const image = open('./test_image.jpg', 'b');

export let options = {
	stages: [
		{ duration: '15s', target: 5 },
		{ duration: '30s', target: 20 },
		{ duration: '1m', target: 0 }
	]
};

export default function() {
	const signRes = http.post(SIGN_URL, null);
	const signOk = check(signRes, {
		'sign: status is 200': (r) => r.status === 200,
	});

	if (!signOk) {
		fail('failed to get upload signature');
	}

	const signData = signRes.json();
	const cloudName = signData.cloud_name;
	const apiKey = signData.api_key;
	const timestamp = String(signData.timestamp);
	const signature = signData.signature;
	const publicId = signData.public_id;
	const folder = signData.folder;

	const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

	const uploadRes = http.post(cloudinaryUrl, {
		file: http.file(image, 'test-image.jpg', 'image/jpeg'),
		api_key: apiKey,
		timestamp: timestamp,
		signature: signature,
		public_id: publicId,
		folder: folder,
	});

	const uploadOk = check(uploadRes, {
		'cloudinary: status is 200': (r) => r.status === 200,
	});

	if (!uploadOk) {
		fail('cloudinary upload failed');
	}

	const uploadData = uploadRes.json();

	const completeRes = http.post(
		UPLOAD_COMPLETE_URL,
		JSON.stringify({
			filename: 'test-image.jpg',
			size: uploadData.bytes,
			file_path: uploadData.secure_url,
		}),
		{ headers: { 'Content-Type': 'application/json' } }
	);

	check(completeRes, {
		'complete: status is 200': (r) => r.status === 200,
		'complete: metadata saved': (r) => r.json().message === "File metadata saved successfully",
	});
}
