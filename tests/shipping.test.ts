import { describe, expect, it } from "vitest";
import { calculateShippingCostPence } from "../src/shipping";

describe("GBP standard shipping", () => {
	it.each([
		{ subtotalPence: 19_999n, expected: 499 },
		{ subtotalPence: 20_000n, expected: 499 },
		{ subtotalPence: 20_001n, expected: 0 },
		{ subtotalPence: 0n, expected: 499 },
		{ subtotalPence: 4_611_686_014_132_420_609n, expected: 0 },
	])(
		"charges $expected pence for $subtotalPence pence in a non-empty cart",
		({ subtotalPence, expected }) => {
			expect(calculateShippingCostPence(subtotalPence, false)).toBe(expected);
		},
	);

	it("does not charge shipping for an empty cart", () => {
		expect(calculateShippingCostPence(0n, true)).toBe(0);
	});

	it("rejects a negative subtotal", () => {
		expect(() => calculateShippingCostPence(-1n, false)).toThrow(RangeError);
	});
});
