import type { User } from "../generated/prisma/client";

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

export function toProfileResponseDto(user: User): ProfileResponseDto {
	return {
		...toUserResponseDto(user),
		phone: user.phone,
		addressLine1: user.addressLine1,
		addressLine2: user.addressLine2,
		city: user.city,
		postcode: user.postcode,
	};
}
