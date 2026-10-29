import type { User, UserAddresses } from "../generated/prisma/client";
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

export interface AddressResponseDto {
	label: string | null;
	addressLine1: string | null;
	addressLine2: string | null;
	city: string | null;
	postcode: string | null;
}

export interface ProfileResponseDto extends UserResponseDto {
	phone: string | null;
	homeAddress: AddressResponseDto | null;
	otherAddresses: AddressResponseDto[];
}

function toAddressResponseDto(address: UserAddresses): AddressResponseDto {
	return {
		label: address.label,
		addressLine1: address.addressLine1,
		addressLine2: address.addressLine2,
		city: address.city,
		postcode: address.postcode,
	};
}

export function toProfileResponseDto(user: ProfileUser): ProfileResponseDto {
	const home = user.addresses.find((address) => address.addressType === "home");
	return {
		...toUserResponseDto(user),
		phone: user.phone,
		homeAddress: home ? toAddressResponseDto(home) : null,
		otherAddresses: user.addresses
			.filter((address) => address.addressType !== "home")
			.map(toAddressResponseDto),
	};
}
