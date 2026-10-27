import {
	Prisma,
	type PrismaClient,
	type User,
} from "../generated/prisma/client";
import { EmailAlreadyRegisteredError } from "../errors/emailAlreadyRegisteredError";

export interface CreateUserData {
	email: string;
	name: string;
	passwordHash: string;
	safeWordHint: string;
	safeWordHash: string;
}

export interface UserRepository {
	create(data: CreateUserData): Promise<User>;
}

export class PrismaUserRepository implements UserRepository {
	constructor(private readonly prisma: PrismaClient) {}

	async create(data: CreateUserData): Promise<User> {
		try {
			return await this.prisma.user.create({ data });
		} catch (error) {
			if (
				error instanceof Prisma.PrismaClientKnownRequestError &&
				error.code === "P2002"
			) {
				throw new EmailAlreadyRegisteredError();
			}

			throw error;
		}
	}
}
