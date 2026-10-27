import type { Admin, PrismaClient, User } from "../generated/prisma/client";

export type UserWithAdmin = User & { admin?: Admin | null };

export interface LoginRepository {
	findByEmail(email: string): Promise<UserWithAdmin | null>;
}

export class PrismaLoginRepository implements LoginRepository {
	constructor(private readonly prisma: PrismaClient) {}

	async findByEmail(email: string): Promise<UserWithAdmin | null> {
		return this.prisma.user.findUnique({
			where: { email },
			include: { admin: true },
		});
	}
}
