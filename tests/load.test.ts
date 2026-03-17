import http from "k6/http";
import { check, fail, sleep } from "k6";


const TEST_IMAGE = open('./image.jpg', 'b');
const SIGN_API_ENDPOINT = "http://localhost:3000/grayscale/uploads/sign";
const UPLOAD_COMPLETE_ENDPOINT = "http://localhost:3000/grayscale/uploads/complete";
const STATUS_API_ENDPOINT = "http://localhost:3000/grayscale/jobs/status";
const STATUS_POLL_INTERVAL_SECONDS = 1;
const STATUS_POLL_TIMEOUT_SECONDS = 30;


export const options = {
	stages: [
		{ duration: '1m', target: 50 },
		{ duration: '3m', target: 100 },
		{ duration: '1m', target: 0 },
	],
	thresholds: {
		"http_req_duration{name:sign_endpoint}": ["p(95)<500"],
		"http_req_duration{name:complete_endpoint}": ["p(95)<500"],
		"http_req_duration{name:status_endpoint}": ["p(95)<500"]
	}
};

function pollJobStatus(jobId) {
	const startedAt = Date.now();

	while ((Date.now() - startedAt) < STATUS_POLL_TIMEOUT_SECONDS * 1000) {
		const statusResponse = http.get(`${STATUS_API_ENDPOINT}/${jobId}`, {
			tags: { name: 'status_endpoint' },
		});
		if (statusResponse.error) {
			fail(`status endpoint transport layer error: ${statusResponse.error}`);
		}

		const statusOk = check(statusResponse, {
			'status response is 200': (r) => r.status === 200,
			'status response includes jobId': (r) => r.json().data.jobId === jobId,
		});

		if (!statusOk) {
			fail('request for job status failed');
		}

		const statusPayload = statusResponse.json();
		if (statusPayload.data.status === "completed" || statusPayload.data.status === "failed") {
			return statusPayload.data;
		}

		sleep(STATUS_POLL_INTERVAL_SECONDS);
	}

	fail(`job ${jobId} did not reach a terminal state within ${STATUS_POLL_TIMEOUT_SECONDS} seconds`);
}


export default function() {

	// CLIENT REQUESTS A SIGNATURE FOR SIGNED UPLOADS
	const signedResponse = http.get(SIGN_API_ENDPOINT, { tags: { name: 'sign_endpoint' } });
	if (signedResponse.error) {
		fail(`transport layer error: ${signedResponse.error}`);
	}

	const signOk = check(signedResponse, {
		'signed response is 200': (r) => r.status === 200,
	});

	if (!signOk) {
		fail('request for retrieving signature for signed uploads failed');
	}
	const signedPayload = signedResponse.json();
	const signData = signedPayload.data;

	// CLIENT UPLOADS FILE TO CLOUDINARY USING THE SIGNATURE
	const cloudinaryURL = `https://api.cloudinary.com/v1_1/${signData.cloud_name}/image/upload`;
	const cloudinaryPayload = {
		file: http.file(TEST_IMAGE, "test_image.jpg", "image/jpeg"),
		api_key: signData.api_key,
		timestamp: signData.timestamp,
		signature: signData.signature,
		public_id: signData.public_id,
		folder: signData.folder
	};

	const uploadResponse = http.post(cloudinaryURL, cloudinaryPayload, { tags: { name: 'cloudinary_upload' } });
	if (uploadResponse.error) {
		fail(`cloudinary upload failed: ${uploadResponse.error}`);
	}

	const uploadOk = check(uploadResponse, {
		'upload response is 200': (r) => r.status === 200,
	});

	if (!uploadOk) {
		fail('request for uploading file to cloudinary failed');
	}

	// CLIENT SENDS A REQUEST STATING THE UPLOAD IS SUCCESSFULL
	// SO THE SERVER CAN START PROCESSING THE IMAGE (this is a temporary solution, we cannot say if the client's request is reliable)
	const cloudinaryResponse = uploadResponse.json();
	const completePayload = {
		filename: cloudinaryResponse.original_filename,
		size: cloudinaryResponse.bytes,
		file_path: cloudinaryResponse.secure_url
	};

	const uploadCompleteResponse = http.post(UPLOAD_COMPLETE_ENDPOINT,
		JSON.stringify(completePayload),
		{ tags: { name: 'complete_endpoint' }, headers: { "Content-Type": "application/json" } },
	);
	if (uploadCompleteResponse.error) {
		fail(`upload_complete transport layer error: ${uploadCompleteResponse.error}`);
	}

	const uploadCompleteOk = check(uploadCompleteResponse, {
		'upload_complete response is 200': (r) => r.status === 200,
		'upload_complete success response': (r) => r.json().message === "File metadata saved successfully",
		'upload_complete returns jobId': (r) => typeof r.json().data.jobId === "number",
	});

	if (!uploadCompleteOk) {
		fail('request for upload_complete failed');
	}

	const uploadCompletePayload = uploadCompleteResponse.json().data;
	const finalStatus = pollJobStatus(uploadCompletePayload.jobId);
	check(finalStatus, {
		'job reaches completed status': (statusPayload) => statusPayload.status === "completed",
	});

}
