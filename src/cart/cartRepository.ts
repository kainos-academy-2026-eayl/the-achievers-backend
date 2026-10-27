import { CartError } from "../errors/cartError";
import type { Prisma, PrismaClient } from "../generated/prisma/client";
import type { CartItemWithProduct } from "../model/cartItemWithProduct";

export interface CartRepository {
	transaction<T>(work: (repository: CartRepository) => Promise<T>): Promise<T>;
	findByCartId(cartId: string): Promise<CartItemWithProduct[]>;
	add(cartId: string, productId: string, quantity: number): Promise<void>;
	setQuantity(
		cartId: string,
		productId: string,
		quantity: number,
	): Promise<boolean>;
	remove(cartId: string, productId: string): Promise<void>;
}

export class PrismaCartRepository implements CartRepository {
	constructor(
		private readonly prisma: Prisma.TransactionClient | PrismaClient,
	) {}

	transaction<T>(work: (repository: CartRepository) => Promise<T>): Promise<T> {
		return this.prisma.$transaction((transaction) =>
			work(new PrismaCartRepository(transaction)),
		);
	}

	findByCartId(cartId: string): Promise<CartItemWithProduct[]> {
		return this.prisma.cartItem.findMany({
			where: { cartId },
			include: { product: true },
			orderBy: { productId: "asc" },
		});
	}

	async add(
		cartId: string,
		productId: string,
		quantity: number,
	): Promise<void> {
		await this.prisma.$executeRaw`
			INSERT INTO "Cart" ("id")
			VALUES (${cartId}::uuid)
			ON CONFLICT ("id") DO NOTHING
		`;

		// A single upsert prevents lost increments, including simultaneous first adds.
		const count = await this.prisma.$executeRaw`
			INSERT INTO "CartItem" ("cartId", "productId", "quantity")
			VALUES (${cartId}::uuid, ${productId}, ${quantity}::integer)
			ON CONFLICT ("cartId", "productId") DO UPDATE
			SET "quantity" = "CartItem"."quantity" + EXCLUDED."quantity"
			WHERE "CartItem"."quantity" <= 2147483647 - EXCLUDED."quantity"
		`;
		if (count === 0) {
			throw new CartError(
				"Adding these units would exceed the maximum quantity",
				400,
			);
		}
	}

	async setQuantity(
		cartId: string,
		productId: string,
		quantity: number,
	): Promise<boolean> {
		const result = await this.prisma.cartItem.updateMany({
			where: { cartId, productId },
			data: { quantity },
		});
		return result.count > 0;
	}

	async remove(cartId: string, productId: string): Promise<void> {
		await this.prisma.cartItem.deleteMany({ where: { cartId, productId } });
	}
}
