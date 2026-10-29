import type { UpdateProfileDto } from "../dtos/updateProfileDto";
import { EmailAlreadyRegisteredError } from "../errors/emailAlreadyRegisteredError";
import {
	Prisma,
	type PrismaClient,
	type User,
	type UserAddresses,
} from "../generated/prisma/client";

export type ProfileUpdateData = Omit<UpdateProfileDto, "currentPassword">;
export type ProfileUser = User & { addresses: UserAddresses[] };

export interface ProfileRepository {
	findById(id: number): Promise<ProfileUser | null>;
	update(id: number, data: ProfileUpdateData): Promise<ProfileUser>;
}

const includeAddresses = {
	addresses: { orderBy: { addressId: "asc" } },
} as const;

export class PrismaProfileRepository implements ProfileRepository {
	constructor(private readonly prisma: PrismaClient) {}

	async findById(id: number): Promise<ProfileUser | null> {
		return this.prisma.user.findUnique({
			where: { id },
			include: includeAddresses,
		});
	}

	async update(id: number, data: ProfileUpdateData): Promise<ProfileUser> {
		const { addressLine1, addressLine2, city, postcode, ...userData } = data;
		const address = { addressLine1, addressLine2, city, postcode };
		try {
			return await this.prisma.$transaction(async (tx) => {
				await tx.user.update({ where: { id }, data: userData });
				const existing = await tx.userAddresses.findFirst({
					where: { userId: id },
					orderBy: { addressId: "asc" },
				});
				if (existing) {
					await tx.userAddresses.update({
						where: { addressId: existing.addressId },
						data: address,
					});
				} else if (Object.values(address).some((value) => value !== null)) {
					await tx.userAddresses.create({ data: { userId: id, ...address } });
				}
				return tx.user.findUniqueOrThrow({
					where: { id },
					include: includeAddresses,
				});
			});
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
