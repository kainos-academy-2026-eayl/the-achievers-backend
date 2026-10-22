import { CartError } from "../errors/cartError";
import { toCartResponseDto } from "../mappers/cartMapper";
import type { ProductRepository } from "../products/productRepository";
import type { CartRepository } from "./cartRepository";

export class CartService {
	constructor(
		private readonly cartRepository: CartRepository,
		private readonly productRepository: Pick<ProductRepository, "findById">,
	) {}

	async get(cartId: string) {
		return toCartResponseDto(await this.cartRepository.findByCartId(cartId));
	}

	async add(cartId: string, productId: string, quantity: number) {
		await this.requirePricedProduct(productId);
		await this.cartRepository.add(cartId, productId, quantity);
		return this.get(cartId);
	}

	async setQuantity(cartId: string, productId: string, quantity: number) {
		await this.requirePricedProduct(productId);
		const updated = await this.cartRepository.setQuantity(
			cartId,
			productId,
			quantity,
		);
		if (!updated) {
			throw new CartError("Product not found in cart", 404);
		}
		return this.get(cartId);
	}

	async remove(cartId: string, productId: string) {
		await this.cartRepository.remove(cartId, productId);
		return this.get(cartId);
	}

	private async requirePricedProduct(productId: string): Promise<void> {
		const product = await this.productRepository.findById(productId);
		if (product === null) {
			throw new CartError("Product not found", 404);
		}
		if (product.pricePence === null || product.pricePence < 0) {
			throw new CartError("Product does not have a valid price", 409);
		}
	}
}
