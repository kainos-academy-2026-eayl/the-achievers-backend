export interface RegisterUserDto {
	name: string;
	email: string;
	password: string;
}

export type RegisterUserDtoResult =
	| { success: true; data: RegisterUserDto }
	| { success: false; message: string };

export function parseRegisterUserDto(body: unknown): RegisterUserDtoResult {
	if (typeof body !== "object" || body === null || Array.isArray(body)) {
		return { success: false, message: "Request body must be a JSON object" };
	}

	const fields = body as Record<string, unknown>;
	if (typeof fields.name !== "string" || fields.name.trim().length === 0) {
		return { success: false, message: "Name is required" };
	}
	if (typeof fields.email !== "string") {
		return { success: false, message: "A valid email is required" };
	}

	const email = fields.email.trim().toLowerCase();
	if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
		return { success: false, message: "A valid email is required" };
	}
	if (typeof fields.password !== "string" || fields.password.length < 12) {
		return {
			success: false,
			message: "Password must be at least 12 characters long",
		};
	}
	if (fields.password.length > 128) {
		return {
			success: false,
			message: "Password must be no more than 128 characters long",
		};
	}

	return {
		success: true,
		data: {
			name: fields.name.trim(),
			email,
			password: fields.password,
		},
	};
}
