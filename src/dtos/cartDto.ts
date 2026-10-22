import { CartError } from "../errors/cartError";

export const MAX_CART_QUANTITY = 2_147_483_647;

export function parseCartId(value: string | undefined): string {
	if (
		value === undefined ||
		!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
			value,
		)
	) {
		throw new CartError("X-Cart-Id must be a valid UUID", 400);
	}
	return value.toLowerCase();
}

function parseBody(body: unknown): Record<string, unknown> {
	if (typeof body !== "object" || body === null || Array.isArray(body)) {
		throw new CartError("Request body must be a JSON object", 400);
	}
	return body as Record<string, unknown>;
}

function parseQuantity(value: unknown): number {
	if (
		typeof value !== "number" ||
		!Number.isInteger(value) ||
		value < 1 ||
		value > MAX_CART_QUANTITY
	) {
		throw new CartError(
			`Quantity must be an integer between 1 and ${MAX_CART_QUANTITY}`,
			400,
		);
	}
	return value;
}

export function parseAddCartItemDto(body: unknown) {
	const fields = parseBody(body);
	if (
		typeof fields.productId !== "string" ||
		fields.productId.trim().length === 0
	) {
		throw new CartError("Product ID is required", 400);
	}
	return {
		productId: fields.productId,
		quantity: parseQuantity(fields.quantity),
	};
}

export function parseUpdateCartItemDto(body: unknown) {
	return { quantity: parseQuantity(parseBody(body).quantity) };
}
