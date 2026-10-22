import { vi } from "vitest";
import type { CartApiService } from "../src/cart/cartController";

export const noCart: CartApiService = {
	get: vi.fn(),
	add: vi.fn(),
	setQuantity: vi.fn(),
	remove: vi.fn(),
};
