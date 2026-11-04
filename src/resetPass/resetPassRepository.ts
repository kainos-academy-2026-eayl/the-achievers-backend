import type { PrismaClient } from "../generated/prisma/client";

export interface ResetPassRepository {
	findSafeWordHashByEmail(
		email: string,
	): Promise<{ safeWordHash: string | null } | null>;
	updatePasswordHash(email: string, passwordHash: string): Promise<void>;
}

export class PrismaResetPassRepository implements ResetPassRepository {
	constructor(private readonly prisma: PrismaClient) {}

	async findSafeWordHashByEmail(
		email: string,
	): Promise<{ safeWordHash: string | null } | null> {
		return this.prisma.user.findUnique({
			where: { email },
			select: { safeWordHash: true },
		});
	}

	async updatePasswordHash(email: string, passwordHash: string): Promise<void> {
		await this.prisma.user.update({ where: { email }, data: { passwordHash } });
	}
}
