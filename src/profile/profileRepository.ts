import type { UpdateProfileDto } from "../dtos/updateProfileDto";
import { EmailAlreadyRegisteredError } from "../errors/emailAlreadyRegisteredError";
import {
	Prisma,
	type PrismaClient,
	type User,
} from "../generated/prisma/client";

export type ProfileUpdateData = Omit<UpdateProfileDto, "currentPassword">;

export interface ProfileRepository {
	findById(id: number): Promise<User | null>;
	update(id: number, data: ProfileUpdateData): Promise<User>;
}

export class PrismaProfileRepository implements ProfileRepository {
	constructor(private readonly prisma: PrismaClient) {}

	async findById(id: number): Promise<User | null> {
		return this.prisma.user.findUnique({ where: { id } });
	}

	async update(id: number, data: ProfileUpdateData): Promise<User> {
		try {
			return await this.prisma.user.update({ where: { id }, data });
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
