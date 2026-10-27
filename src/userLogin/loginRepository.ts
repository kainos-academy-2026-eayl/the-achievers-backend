import type { PrismaClient, User } from "../generated/prisma/client";

export interface LoginRepository {
	findByEmail(email: string): Promise<User | null>;
}

export class PrismaLoginRepository implements LoginRepository {
	constructor(private readonly prisma: PrismaClient) {}

	async findByEmail(email: string): Promise<User | null> {
		return this.prisma.user.findUnique({ where: { email } });
	}
}
