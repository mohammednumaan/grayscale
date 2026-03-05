import http from 'k6/http'
import { check } from 'k6'

const SERVER_URL = "http://localhost:3000/grayscale/upload";
const image = open('./crusher_joe_image.jpeg', 'b');

export const options = {
	vus: 200,
	duration: '30s'
}

export default function() {
	const payload = {
		image: http.file(image, 'test-image.jpg', 'image/jpeg')
	}

	const res = http.post(SERVER_URL, payload);
	check(res, {
		'Post status is 200': (r) => res.status === 200,
	})

}
