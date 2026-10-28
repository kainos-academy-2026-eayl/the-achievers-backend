import { CartError } from "../errors/cartError";
import type { CartItemWithProduct } from "../model/cartItemWithProduct";

export interface CartResponseDto {
	items: {
		product: { id: string; name: string; price: number };
		quantity: number;
	}[];
	estimatedShippingCost: number;
}

export function toCartResponseDto(
	items: CartItemWithProduct[],
	estimatedShippingCostPence: number,
): CartResponseDto {
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
		estimatedShippingCost: estimatedShippingCostPence / 100,
	};
}
