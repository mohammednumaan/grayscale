import {
	S3Client,
	PutObjectCommand,
	GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import env from "../env.js";

const s3Client = new S3Client({
	region: env.s3.region,
	credentials:
		env.s3.accessKeyId && env.s3.secretAccessKey
			? {
				accessKeyId: env.s3.accessKeyId,
				secretAccessKey: env.s3.secretAccessKey,
			}
			: undefined,
});

async function getPresignedUploadUrl(
	key: string,
	expiresIn = 3600,
): Promise<string> {
	const command = new PutObjectCommand({
		Bucket: env.s3.bucket,
		Key: key,
	});

	return getSignedUrl(s3Client, command, { expiresIn });
}

async function getPresignedDownloadUrl(
	key: string,
	expiresIn = 3600,
): Promise<string> {
	const command = new GetObjectCommand({
		Bucket: env.s3.bucket,
		Key: key,
	});

	return getSignedUrl(s3Client, command, { expiresIn });
}


export {
	getPresignedUploadUrl,
	getPresignedDownloadUrl,
	s3Client,
};
