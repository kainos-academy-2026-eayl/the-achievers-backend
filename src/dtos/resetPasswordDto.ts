import { MAX_SAFE_WORD_LENGTH } from "./registerUserDto";

export interface VerifySafeWordDto {
	email: string;
	safeWord: string;
}

export interface ResetPasswordDto extends VerifySafeWordDto {
	newPassword: string;
}

export type ResetDtoResult<T> =
	| { success: true; data: T }
	| { success: false; message: string };

export function parseVerifySafeWordDto(
	body: unknown,
): ResetDtoResult<VerifySafeWordDto> {
	if (typeof body !== "object" || body === null || Array.isArray(body)) {
		return { success: false, message: "Request body must be a JSON object" };
	}

	const fields = body as Record<string, unknown>;
	if (typeof fields.email !== "string") {
		return { success: false, message: "A valid email is required" };
	}
	const email = fields.email.trim().toLowerCase();
	if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
		return { success: false, message: "A valid email is required" };
	}
	if (
		typeof fields.safeWord !== "string" ||
		fields.safeWord.trim().length === 0
	) {
		return { success: false, message: "A non-blank safe word is required" };
	}
	if (fields.safeWord.length > MAX_SAFE_WORD_LENGTH) {
		return {
			success: false,
			message: `Safe word must be no more than ${MAX_SAFE_WORD_LENGTH} characters long`,
		};
	}

	return { success: true, data: { email, safeWord: fields.safeWord } };
}

export function parseResetPasswordDto(
	body: unknown,
): ResetDtoResult<ResetPasswordDto> {
	const verified = parseVerifySafeWordDto(body);
	if (!verified.success) {
		return verified;
	}

	const { newPassword } = body as Record<string, unknown>;
	if (typeof newPassword !== "string" || newPassword.length < 12) {
		return {
			success: false,
			message: "Password must be at least 12 characters long",
		};
	}
	if (newPassword.length > 128) {
		return {
			success: false,
			message: "Password must be no more than 128 characters long",
		};
	}

	return { success: true, data: { ...verified.data, newPassword } };
}
