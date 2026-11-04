import { SAFE_WORD_HINTS, type SafeWordHint } from "../dtos/registerUserDto";
import type { SafeWordHintRepository } from "./safeWordHintRepository";

export class SafeWordHintService {
	constructor(private readonly repository: SafeWordHintRepository) {}

	async getSafeWordHint(email: string): Promise<SafeWordHint | null> {
		const user = await this.repository.findSafeWordHintByEmail(email);
		// The column is a free-form string, so only return known identifiers.
		return SAFE_WORD_HINTS.find((hint) => hint === user?.safeWordHint) ?? null;
	}
}
