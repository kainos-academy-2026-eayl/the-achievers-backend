import type { AddressDto, UpdateProfileDto } from "../dtos/updateProfileDto";
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

type AddressSlot = { addressType: "home" | "other"; address: AddressDto };

export class PrismaProfileRepository implements ProfileRepository {
	constructor(private readonly prisma: PrismaClient) {}

	async findById(id: number): Promise<ProfileUser | null> {
		return this.prisma.user.findUnique({
			where: { id },
			include: includeAddresses,
		});
	}

	async update(id: number, data: ProfileUpdateData): Promise<ProfileUser> {
		const { homeAddress, otherAddresses, ...userData } = data;
		const wanted: AddressSlot[] = [
			...(homeAddress
				? [{ addressType: "home" as const, address: homeAddress }]
				: []),
			...otherAddresses.map((address) => ({
				addressType: "other" as const,
				address,
			})),
		];

		try {
			return await this.prisma.$transaction(async (tx) => {
				await tx.user.update({ where: { id }, data: userData });

				// Update rows in place so address IDs stay stable for future orders.
				const existing = await tx.userAddresses.findMany({
					where: { userId: id },
					orderBy: { addressId: "asc" },
				});
				const unused = [...existing];
				for (const { addressType, address } of wanted) {
					const index = unused.findIndex(
						(row) => row.addressType === addressType,
					);
					const [row] = index >= 0 ? unused.splice(index, 1) : [];
					const values = { addressType, ...address };
					if (row) {
						await tx.userAddresses.update({
							where: { addressId: row.addressId },
							data: values,
						});
					} else {
						await tx.userAddresses.create({ data: { userId: id, ...values } });
					}
				}
				if (unused.length > 0) {
					await tx.userAddresses.deleteMany({
						where: { addressId: { in: unused.map((row) => row.addressId) } },
					});
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
