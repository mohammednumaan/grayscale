import http from "k6/http";
import { check, fail } from "k6";


const TEST_IMAGE = open('./image.jpg', 'b');
const SIGN_API_ENDPOINT = "http://localhost:3000/grayscale/uploads/sign";
const UPLOAD_COMPLETE_ENDPOINT = "http://localhost:3000/grayscale/uploads/complete";


export const options = {

	vus: 50,
	duration: "30s",
	thresholds: {
		"http_req_duration{name:sign_endpoint}": ["p(95)<500"],
		"http_req_duration{name:complete_endpoint}": ["p(95)<500"]
	}
};


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

	// CLIENT UPLOADS FILE TO CLOUDINARY USING THE SIGNATURE
	const cloudinaryURL = `https://api.cloudinary.com/v1_1/${signedPayload.cloud_name}/image/upload`;
	const cloudinaryPayload = {
		file: http.file(TEST_IMAGE, "test_image.jpg", "image/jpeg"),
		api_key: signedPayload.api_key,
		timestamp: signedPayload.timestamp,
		signature: signedPayload.signature,
		public_id: signedPayload.public_id,
		folder: signedPayload.folder
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
	});

	if (!uploadCompleteOk) {
		fail('request for upload_complete failed');
	}

}
