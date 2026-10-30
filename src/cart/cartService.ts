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
		return this.getFromRepository(cartId, this.cartRepository);
	}

	async add(cartId: string, productId: string, quantity: number) {
		await this.requirePricedProduct(productId);
		return this.cartRepository.transaction(async (repository) => {
			await repository.lockCart(cartId);
			await repository.add(cartId, productId, quantity);
			return this.getFromRepository(cartId, repository);
		});
	}

	async setQuantity(cartId: string, productId: string, quantity: number) {
		await this.requirePricedProduct(productId);
		return this.cartRepository.transaction(async (repository) => {
			await repository.lockCart(cartId);
			const updated = await repository.setQuantity(cartId, productId, quantity);
			if (!updated) {
				throw new CartError("Product not found in cart", 404);
			}
			return this.getFromRepository(cartId, repository);
		});
	}

	async remove(cartId: string, productId: string) {
		return this.cartRepository.transaction(async (repository) => {
			await repository.lockCart(cartId);
			await repository.remove(cartId, productId);
			return this.getFromRepository(cartId, repository);
		});
	}

	private async getFromRepository(cartId: string, repository: CartRepository) {
		const items = await repository.findByCartId(cartId);
		return toCartResponseDto(items);
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
