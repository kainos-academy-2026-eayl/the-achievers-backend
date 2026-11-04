import { CartError } from "../errors/cartError";
import type { CartItemWithProduct } from "../model/cartItemWithProduct";
import { calculateShippingCostPence } from "../shipping";

export interface CartResponseDto {
	items: {
		product: { id: string; name: string; price: number };
		quantity: number;
	}[];
	estimatedShippingCost: number;
}

export function toCartResponseDto(
	items: CartItemWithProduct[],
): CartResponseDto {
	let subtotalPence = 0n;
	const responseItems = items.map(({ product, quantity }) => {
		if (
			product.pricePence === null ||
			!Number.isSafeInteger(product.pricePence) ||
			product.pricePence < 0
		) {
			throw new CartError(
				`Product ${product.id} does not have a valid price`,
				409,
			);
		}
		subtotalPence += BigInt(product.pricePence) * BigInt(quantity);
		return {
			product: {
				id: product.id,
				name: product.name,
				price: product.pricePence / 100,
			},
			quantity,
		};
	});

	return {
		items: responseItems,
		estimatedShippingCost:
			calculateShippingCostPence(subtotalPence, items.length === 0) / 100,
	};
}
