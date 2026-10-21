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
