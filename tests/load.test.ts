import http from 'k6/http'
import { check } from 'k6'

const SERVER_URL = "http://localhost:3000/grayscale/upload";
const image = open('./test_image.jpg', 'b');

export let options = {
	stages: [
		{ duration: '15s', target: 5 },
		{ duration: '30s', target: 20 },
		{ duration: '1m', target: 0 }
	]

};

export default function() {
	const payload = {
		image: http.file(image, 'test-image.jpg', 'image/jpeg')
	}

	const res = http.post(SERVER_URL, payload);
	check(res, {
		'status is 200': (r) => r.status === 200,
		'response contains success message': (r) => r.body.message === "File uploaded successfully"
	})
}
