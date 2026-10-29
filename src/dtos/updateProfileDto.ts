export interface AddressDto {
	label: string | null;
	addressLine1: string;
	addressLine2: string | null;
	city: string;
	postcode: string;
}

export interface UpdateProfileDto {
	name: string;
	email: string;
	phone: string | null;
	homeAddress: AddressDto | null;
	otherAddresses: AddressDto[];
	currentPassword: string;
}

export const MAX_OTHER_ADDRESSES = 2;

export type FieldErrors = Record<string, string>;

export type UpdateProfileDtoResult =
	| { success: true; data: UpdateProfileDto }
	| { success: false; message: string; fieldErrors: FieldErrors };

const ukPhone = /^(?:0(?:[1-6]\d{8,9}|7\d{9})|\+44(?:[1-6]\d{8,9}|7\d{9}))$/;
const ukPostcode =
	/^((?:GIR(?= 0AA$)|[A-PR-UWYZ](?:\d{1,2}|[A-HK-Y]\d{1,2}|\d[A-HJKSTUW]|[A-HK-Y]\d[ABEHMNPRVWXY]))) ?(\d[ABDEFGHJLNPQRSTUWXYZ]{2})$/;

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readText(
	source: Record<string, unknown>,
	field: string,
	errorKey: string,
	errors: FieldErrors,
): string {
	const value = source[field];
	if (value === undefined || value === null) return "";
	if (typeof value !== "string") {
		errors[errorKey] = "Invalid value";
		return "";
	}
	return value.trim();
}

function parseAddress(
	value: unknown,
	prefix: string,
	allowLabel: boolean,
	errors: FieldErrors,
): AddressDto | null {
	if (value === undefined || value === null) return null;
	if (!isObject(value)) {
		errors[prefix] = "Invalid value";
		return null;
	}

	const text = (field: string) =>
		readText(value, field, `${prefix}.${field}`, errors);
	const label = allowLabel ? text("label") : "";
	const addressLine1 = text("addressLine1");
	const addressLine2 = text("addressLine2");
	const city = text("city");
	const postcode = text("postcode").toUpperCase();

	if (!label && !addressLine1 && !addressLine2 && !city && !postcode) {
		return null;
	}

	if (label.length > 40)
		errors[`${prefix}.label`] = "Address name must be 40 characters or fewer";
	if (!addressLine1)
		errors[`${prefix}.addressLine1`] ??= "Enter address line 1";
	else if (addressLine1.length > 100)
		errors[`${prefix}.addressLine1`] =
			"Address line 1 must be 100 characters or fewer";
	if (addressLine2.length > 100)
		errors[`${prefix}.addressLine2`] =
			"Address line 2 must be 100 characters or fewer";
	if (!city) errors[`${prefix}.city`] ??= "Enter your town or city";
	else if (city.length > 60)
		errors[`${prefix}.city`] = "Town or city must be 60 characters or fewer";
	const postcodeParts = ukPostcode.exec(postcode);
	if (!postcode) errors[`${prefix}.postcode`] ??= "Enter your postcode";
	else if (!postcodeParts)
		errors[`${prefix}.postcode`] =
			"Enter a valid UK postcode, for example SW1A 1AA";

	return {
		label: label || null,
		addressLine1,
		addressLine2: addressLine2 || null,
		city,
		postcode: postcodeParts
			? `${postcodeParts[1]} ${postcodeParts[2]}`
			: postcode,
	};
}

export function parseUpdateProfileDto(body: unknown): UpdateProfileDtoResult {
	if (!isObject(body)) {
		return {
			success: false,
			message: "Request body must be a JSON object",
			fieldErrors: {},
		};
	}

	const errors: FieldErrors = {};
	const name = readText(body, "name", "name", errors);
	const email = readText(body, "email", "email", errors).toLowerCase();
	const phone = readText(body, "phone", "phone", errors).replace(
		/[\s()-]/g,
		"",
	);
	const currentPassword = body.currentPassword;

	if (!name) errors.name ??= "Enter your name";
	else if (name.length > 100)
		errors.name = "Name must be 100 characters or fewer";

	if (!email) errors.email ??= "Enter your email address";
	else if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
		errors.email = "Enter a valid email address, for example name@example.com";

	if (phone && !ukPhone.test(phone))
		errors.phone = "Enter a valid UK phone number, for example 07123 456789";

	const homeAddress = parseAddress(
		body.homeAddress,
		"homeAddress",
		false,
		errors,
	);

	const otherAddresses: AddressDto[] = [];
	const rawOthers = body.otherAddresses ?? [];
	if (!Array.isArray(rawOthers)) {
		errors.otherAddresses = "Invalid value";
	} else {
		rawOthers.forEach((raw, index) => {
			const address = parseAddress(
				raw,
				`otherAddresses.${index}`,
				true,
				errors,
			);
			if (address) otherAddresses.push(address);
		});
		if (otherAddresses.length > MAX_OTHER_ADDRESSES) {
			errors.otherAddresses = `You can save up to ${MAX_OTHER_ADDRESSES} other addresses`;
		} else if (otherAddresses.length > 0 && !homeAddress) {
			errors.otherAddresses ??=
				"Add a home address before adding other addresses";
		}
	}

	if (typeof currentPassword !== "string" || currentPassword === "") {
		errors.currentPassword = "Enter your current password to save changes";
	} else if (currentPassword.length > 128) {
		errors.currentPassword = "Your current password is incorrect";
	}

	if (Object.keys(errors).length > 0) {
		return {
			success: false,
			message: "Validation failed",
			fieldErrors: errors,
		};
	}

	return {
		success: true,
		data: {
			name,
			email,
			phone: phone || null,
			homeAddress,
			otherAddresses,
			currentPassword: currentPassword as string,
		},
	};
}
