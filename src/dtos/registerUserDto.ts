export const SAFE_WORD_HINTS = [
	"mothers-maiden-name",
	"favourite-movie",
	"first-pet",
	"childhood-friend",
	"holiday",
] as const;

export type SafeWordHint = (typeof SAFE_WORD_HINTS)[number];

// Limit measured using JavaScript string.length (UTF-16 code units).
export const MAX_SAFE_WORD_LENGTH = 128;

export interface RegisterUserDto {
	name: string;
	email: string;
	password: string;
	safeWordHint: SafeWordHint;
	safeWord: string;
}

export type RegisterUserDtoResult =
	| { success: true; data: RegisterUserDto; }
	| { success: false; message: string; };

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

	const safeWordHint = SAFE_WORD_HINTS.find(
		(hint) => hint === fields.safeWordHint,
	);
	if (!safeWordHint) {
		return { success: false, message: "A valid safe-word hint is required" };
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

	return {
		success: true,
		data: {
			name: fields.name.trim(),
			email,
			password: fields.password,
			safeWordHint,
			safeWord: fields.safeWord,
		},
	};
}
