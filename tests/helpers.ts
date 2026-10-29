import { vi } from "vitest";
import type { CartApiService } from "../src/cart/cartController";

export const noCart: CartApiService = {
	get: vi.fn(),
	add: vi.fn(),
	setQuantity: vi.fn(),
	remove: vi.fn(),
};

export const emptyProfileFields = {
	phone: null,
	addressLine1: null,
	addressLine2: null,
	city: null,
	postcode: null,
};
