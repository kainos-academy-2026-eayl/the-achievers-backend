import { vi } from "vitest";
import type { CartApiService } from "../src/cart/cartController";

export const testJwtSecret = "test-only-secret-not-for-production-123456789";

export const noCart: CartApiService = {
	get: vi.fn(),
	add: vi.fn(),
	setQuantity: vi.fn(),
	remove: vi.fn(),
};
