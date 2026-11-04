import type { LoginUserDto } from "../model/loginUserDto";

export type LoginUserDtoResult =
	| { success: true; data: LoginUserDto }
	| { success: false; message: string };

export function parseLoginUserDto(body: unknown): LoginUserDtoResult {
	if (typeof body !== "object" || body === null || Array.isArray(body)) {
		return { success: false, message: "Request body must be a JSON object" };
	}

	if (!("email" in body) || typeof body.email !== "string") {
		return { success: false, message: "A valid email is required" };
	}

	const email = body.email.trim().toLowerCase();
	if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
		return { success: false, message: "A valid email is required" };
	}
	if (
		!("password" in body) ||
		typeof body.password !== "string" ||
		body.password.length === 0 ||
		body.password.length > 128
	) {
		return {
			success: false,
			message: "Password must be between 1 and 128 characters long",
		};
	}

	return { success: true, data: { email, password: body.password } };
}
