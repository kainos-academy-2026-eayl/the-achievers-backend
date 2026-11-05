export interface SafeWordHintQueryDto {
	email: string;
}

export type SafeWordHintQueryDtoResult =
	| { success: true; data: SafeWordHintQueryDto }
	| { success: false; message: string };

export function parseSafeWordHintQueryDto(
	query: unknown,
): SafeWordHintQueryDtoResult {
	if (
		typeof query !== "object" ||
		query === null ||
		!("email" in query) ||
		typeof query.email !== "string"
	) {
		return { success: false, message: "A valid email is required" };
	}

	const email = query.email.trim().toLowerCase();
	if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
		return { success: false, message: "A valid email is required" };
	}

	return { success: true, data: { email } };
}
