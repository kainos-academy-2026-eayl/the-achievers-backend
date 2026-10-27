export interface UpdateProfileDto {
	name: string;
	email: string;
	phone: string | null;
	addressLine1: string | null;
	addressLine2: string | null;
	city: string | null;
	postcode: string | null;
	currentPassword: string;
}

export type ProfileField = keyof UpdateProfileDto;
export type FieldErrors = Partial<Record<ProfileField, string>>;

export type UpdateProfileDtoResult =
	| { success: true; data: UpdateProfileDto }
	| { success: false; message: string; fieldErrors: FieldErrors };

const ukPhone = /^(?:0|\+44)\d{9,10}$/;
const ukPostcode = /^(GIR(?= ?0AA$)|[A-PR-UWYZ](?:\d{1,2}|[A-HK-Y]\d{1,2}|\d[A-HJKPSTUW]|[A-HK-Y]\d[ABEHMNPRVWXY])) ?(\d[ABD-HJLNP-UW-Z]{2})$/;

export function parseUpdateProfileDto(body: unknown): UpdateProfileDtoResult {
	if (typeof body !== "object" || body === null || Array.isArray(body)) {
		return {
			success: false,
			message: "Request body must be a JSON object",
			fieldErrors: {},
		};
	}

	const fields = body as Record<string, unknown>;
	const errors: FieldErrors = {};
	const text = (field: ProfileField): string => {
		const value = fields[field];
		if (value === undefined || value === null) return "";
		if (typeof value !== "string") {
			errors[field] = "Invalid value";
			return "";
		}
		return value.trim();
	};

	const name = text("name");
	const email = text("email").toLowerCase();
	const phone = text("phone").replace(/[\s()-]/g, "");
	const addressLine1 = text("addressLine1");
	const addressLine2 = text("addressLine2");
	const city = text("city");
	const postcode = text("postcode").toUpperCase();
	const currentPassword = fields.currentPassword;

	if (!name) errors.name ??= "Enter your name";
	else if (name.length > 100)
		errors.name = "Name must be 100 characters or fewer";

	if (!email) errors.email ??= "Enter your email address";
	else if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
		errors.email = "Enter a valid email address, for example name@example.com";

	if (phone && !ukPhone.test(phone))
		errors.phone = "Enter a valid UK phone number, for example 07123 456789";

	if (addressLine1 || addressLine2 || city || postcode) {
		if (!addressLine1) errors.addressLine1 ??= "Enter address line 1";
		if (!city) errors.city ??= "Enter your town or city";
		if (!postcode) errors.postcode ??= "Enter your postcode";
	}
	if (addressLine1.length > 100)
		errors.addressLine1 = "Address line 1 must be 100 characters or fewer";
	if (addressLine2.length > 100)
		errors.addressLine2 = "Address line 2 must be 100 characters or fewer";
	if (city.length > 60)
		errors.city = "Town or city must be 60 characters or fewer";
	const postcodeParts = ukPostcode.exec(postcode);
	if (postcode && !postcodeParts)
		errors.postcode = "Enter a valid UK postcode, for example SW1A 1AA";

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
			addressLine1: addressLine1 || null,
			addressLine2: addressLine2 || null,
			city: city || null,
			postcode: postcodeParts
				? `${postcodeParts[1]} ${postcodeParts[2]}`
				: null,
			currentPassword: currentPassword as string,
		},
	};
}
