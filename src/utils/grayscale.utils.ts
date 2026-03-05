import { Jimp } from "jimp";


export async function grayscaleImage(imageBuffer: Buffer) {
	try {
		const image = await Jimp.fromBuffer(imageBuffer);
		await image.greyscale().write('output-grayscale.png');
	}

	catch (err) {
		console.error('Error', err);
	}


}
