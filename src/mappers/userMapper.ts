import type { User } from "../generated/prisma/client";
import type { ProfileUser } from "../profile/profileRepository";

export interface UserResponseDto {
	email: string;
	name: string;
	createdAt: Date;
}

export function toUserResponseDto(user: User): UserResponseDto {
	return {
		email: user.email,
		name: user.name,
		createdAt: user.createdAt,
	};
}

export interface ProfileResponseDto extends UserResponseDto {
	phone: string | null;
	addressLine1: string | null;
	addressLine2: string | null;
	city: string | null;
	postcode: string | null;
}

export function toProfileResponseDto(user: ProfileUser): ProfileResponseDto {
	const address = user.user[0];

	return {
		...toUserResponseDto(user),
		phone: user.phone,
		addressLine1: address?.addressLine1 ?? null,
		addressLine2: address?.addressLine2 ?? null,
		city: address?.city ?? null,
		postcode: address?.postcode ?? null,
	};
}
