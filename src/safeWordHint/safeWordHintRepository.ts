import type { PrismaClient } from "../generated/prisma/client";

export interface SafeWordHintRepository {
	findSafeWordHintByEmail(
		email: string,
	): Promise<{ safeWordHint: string | null } | null>;
}

export class PrismaSafeWordHintRepository implements SafeWordHintRepository {
	constructor(private readonly prisma: PrismaClient) {}

	async findSafeWordHintByEmail(
		email: string,
	): Promise<{ safeWordHint: string | null } | null> {
		return this.prisma.user.findUnique({
			where: { email },
			select: { safeWordHint: true },
		});
	}
}
