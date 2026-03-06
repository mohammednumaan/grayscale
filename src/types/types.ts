interface FileMetadata {
	id: string;
	name: string;
	size: number;
	type: string;
	createdAt: Date;
	updatedAt: Date;
	filePath: string;
}

export { type FileMetadata };
