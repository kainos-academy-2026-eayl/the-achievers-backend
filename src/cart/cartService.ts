import { CartError } from "../errors/cartError";
import { toCartResponseDto } from "../mappers/cartMapper";
import type { ProductRepository } from "../products/productRepository";
import type { CartRepository } from "./cartRepository";
import type { CartItemWithProduct } from "../model/cartItemWithProduct";

const FREE_DELIVERY_THRESHOLD_PENCE = 5_000n;
const ESTIMATED_SHIPPING_COST_PENCE = 440;

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
      await repository.add(cartId, productId, quantity);
      return this.getFromRepository(cartId, repository);
    });
  }

  async setQuantity(cartId: string, productId: string, quantity: number) {
    await this.requirePricedProduct(productId);
    return this.cartRepository.transaction(async (repository) => {
      const updated = await repository.setQuantity(cartId, productId, quantity);
      if (!updated) {
        throw new CartError("Product not found in cart", 404);
      }
      return this.getFromRepository(cartId, repository);
    });
  }

  async remove(cartId: string, productId: string) {
    return this.cartRepository.transaction(async (repository) => {
      await repository.remove(cartId, productId);
      return this.getFromRepository(cartId, repository);
    });
  }

  private async getFromRepository(cartId: string, repository: CartRepository) {
    const items = await repository.findByCartId(cartId);
    return toCartResponseDto(items, this.estimateShippingCostPence(items));
  }

  private estimateShippingCostPence(items: CartItemWithProduct[]): number {
    if (items.length === 0) return 0;

    let subtotalPence = 0n;
    for (const { product, quantity } of items) {
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
    }

    return subtotalPence >= FREE_DELIVERY_THRESHOLD_PENCE
      ? 0
      : ESTIMATED_SHIPPING_COST_PENCE;
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
