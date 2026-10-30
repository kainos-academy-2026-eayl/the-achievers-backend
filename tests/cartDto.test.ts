import { describe, expect, it } from "vitest";
import {
	MAX_CART_QUANTITY,
	parseAddCartItemDto,
	parseUpdateCartItemDto,
} from "../src/dtos/cartDto";
import { CartError } from "../src/errors/cartError";

describe("cart quantity validation", () => {
	it("limits each cart item's quantity to 99", () => {
		expect(MAX_CART_QUANTITY).toBe(99);
	});

	it.each([1, 98, 99])(
		"accepts quantity %s for adds and updates",
		(quantity) => {
			expect(parseAddCartItemDto({ productId: "cue-1", quantity })).toEqual({
				productId: "cue-1",
				quantity,
			});
			expect(parseUpdateCartItemDto({ quantity })).toEqual({ quantity });
		},
	);

	it.each([0, -1, 1.5, 100, 2_147_483_647, "99", null, undefined])(
		"rejects quantity %s for adds and updates",
		(quantity) => {
			for (const parse of [
				() => parseAddCartItemDto({ productId: "cue-1", quantity }),
				() => parseUpdateCartItemDto({ quantity }),
			]) {
				expect(parse).toThrow(CartError);
				expect(parse).toThrow("Quantity must be an integer between 1 and 99");
			}
		},
	);
});
