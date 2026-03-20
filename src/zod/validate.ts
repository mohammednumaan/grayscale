import { z } from "zod";

interface SuccessValidationType<T> {
	success: true;
	data: T;
}

interface ErrorValidationType {
	success: false;
	error: z.ZodError;
}

export default function validate<T>(
	schema: z.ZodType<T>,
	inputs: T,
): SuccessValidationType<T> | ErrorValidationType {
	const result = schema.safeParse(inputs);

	if (result.success) {
		return {
			success: true,
			data: result.data,
		};
	} else {
		return {
			success: false,
			error: result.error,
		};
	}
}
