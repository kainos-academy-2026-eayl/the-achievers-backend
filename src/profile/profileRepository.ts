import type { UpdateProfileDto } from "../dtos/updateProfileDto";
import { EmailAlreadyRegisteredError } from "../errors/emailAlreadyRegisteredError";
import { Prisma, type PrismaClient } from "../generated/prisma/client";

export type ProfileUpdateData = Omit<UpdateProfileDto, "currentPassword">;

const profileInclude = {
	user: { orderBy: { addressId: "asc" } },
} satisfies Prisma.UserInclude;

export type ProfileUser = Prisma.UserGetPayload<{
	include: typeof profileInclude;
}>;

export interface ProfileRepository {
	findById(id: number): Promise<ProfileUser | null>;
	update(id: number, data: ProfileUpdateData): Promise<ProfileUser>;
}

export class PrismaProfileRepository implements ProfileRepository {
	constructor(private readonly prisma: PrismaClient) {}

	async findById(id: number): Promise<ProfileUser | null> {
		return this.prisma.user.findUnique({
			where: { id },
			include: profileInclude,
		});
	}

	async update(id: number, data: ProfileUpdateData): Promise<ProfileUser> {
		const { addressLine1, addressLine2, city, postcode, ...userData } = data;
		const addressData = { addressLine1, addressLine2, city, postcode };

		try {
			return await this.prisma.$transaction(async (transaction) => {
				await transaction.user.update({ where: { id }, data: userData });

				const address = await transaction.userAddresses.findFirst({
					where: { userId: id },
					orderBy: { addressId: "asc" },
				});

				if (address) {
					await transaction.userAddresses.update({
						where: { addressId: address.addressId },
						data: addressData,
					});
				} else if (Object.values(addressData).some((value) => value !== null)) {
					await transaction.userAddresses.create({
						data: { userId: id, ...addressData },
					});
				}

				return transaction.user.findUniqueOrThrow({
					where: { id },
					include: profileInclude,
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
