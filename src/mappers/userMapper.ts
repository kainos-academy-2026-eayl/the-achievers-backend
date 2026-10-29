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
}

export function toProfileResponseDto(user: User): ProfileResponseDto {
	return {
		...toUserResponseDto(user),
		phone: user.phone,
		email: user.email,
		name: user.name,
	};
}
