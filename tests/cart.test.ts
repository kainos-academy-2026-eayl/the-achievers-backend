import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { PrismaCartRepository } from "../src/cart/cartRepository";
import { CartService } from "../src/cart/cartService";
import { MAX_CART_QUANTITY } from "../src/dtos/cartDto";
import { PrismaLoginRepository } from "../src/userLogin/loginRepository";
import { LoginService } from "../src/userLogin/loginService";
import { PrismaProductRepository } from "../src/products/productRepository";
import { ProductService } from "../src/products/productService";
import { createPrismaClient } from "../src/prismaClient";
import { PrismaUserRepository } from "../src/userRegistration/userRepository";
import { UserService } from "../src/userRegistration/userService";

const describeWithDatabase = describe.skipIf(!process.env.DATABASE_URL);
const fixturePrefix = `cart-integration-${randomUUID()}`;
const cartIds: string[] = [];
const productIds = {
	below: `${fixturePrefix}-below`,
	exact: `${fixturePrefix}-exact`,
	above: `${fixturePrefix}-above`,
	quarter: `${fixturePrefix}-quarter`,
	penny: `${fixturePrefix}-penny`,
	unpriced: `${fixturePrefix}-unpriced`,
};

describeWithDatabase("cart API with PostgreSQL", () => {
	const prisma = createPrismaClient();
	const productRepository = new PrismaProductRepository(prisma);
	const app = createApp(
		new UserService(new PrismaUserRepository(prisma)),
		new ProductService(productRepository),
		new LoginService(
			new PrismaLoginRepository(prisma),
			"cart-integration-test-secret-with-at-least-32-bytes",
		),
		new CartService(new PrismaCartRepository(prisma), productRepository),
	);

	function newCartId(): string {
		const id = randomUUID();
		cartIds.push(id);
		return id;
	}

	async function add(cartId: string, productId: string, quantity = 1) {
		return request(app)
			.post("/api/cart/items")
			.set("X-Cart-Id", cartId)
			.send({ productId, quantity });
	}

	beforeAll(async () => {
		await prisma.product.createMany({
			data: [
				{
					id: productIds.below,
					name: "Integration Product Below Threshold",
					category: "Integration",
					pricePence: 4_999,
				},
				{
					id: productIds.exact,
					name: "Integration Product At Threshold",
					category: "Integration",
					pricePence: 5_000,
				},
				{
					id: productIds.above,
					name: "Integration Product Above Threshold",
					category: "Integration",
					pricePence: 5_001,
				},
				{
					id: productIds.quarter,
					name: "Integration Quarter Product",
					category: "Integration",
					pricePence: 2_500,
				},
				{
					id: productIds.penny,
					name: "Integration Penny Product",
					category: "Integration",
					pricePence: 1,
				},
				{
					id: productIds.unpriced,
					name: "Integration Unpriced Product",
					category: "Integration",
					pricePence: null,
				},
			],
		});
	});

	afterAll(async () => {
		if (cartIds.length > 0) {
			await prisma.cart.deleteMany({ where: { id: { in: cartIds } } });
		}
		await prisma.product.deleteMany({
			where: { id: { in: Object.values(productIds) } },
		});
		await prisma.$disconnect();
	});

	it("returns the exact cart response shape and zero shipping for an empty cart", async () => {
		const response = await request(app)
			.get("/api/cart")
			.set("X-Cart-Id", newCartId());

		expect(response.status).toBe(200);
		expect(response.body).toEqual({
			items: [],
			estimatedShippingCost: 0,
		});
	});

	it.each([
		{
			name: "£49.99",
			productId: productIds.below,
			price: 49.99,
			shipping: 4.99,
		},
		{ name: "£50.00", productId: productIds.exact, price: 50, shipping: 4.99 },
		{ name: "£50.01", productId: productIds.above, price: 50.01, shipping: 0 },
	])(
		"returns £$shipping shipping for a $name subtotal using real products",
		async ({ productId, price, shipping }) => {
			const response = await add(newCartId(), productId);

			expect(response.status).toBe(200);
			expect(response.body).toEqual({
				items: [
					{
						product: {
							id: productId,
							name: expect.any(String),
							price,
						},
						quantity: 1,
					},
				],
				estimatedShippingCost: shipping,
			});
		},
	);

	it("calculates the threshold from every item in the cart", async () => {
		const cartId = newCartId();
		await add(cartId, productIds.quarter);
		await add(cartId, productIds.quarter);
		const exactlyFifty = await request(app)
			.get("/api/cart")
			.set("X-Cart-Id", cartId);

		expect(exactlyFifty.status).toBe(200);
		expect(exactlyFifty.body.estimatedShippingCost).toBe(4.99);

		const overFifty = await add(cartId, productIds.penny);
		expect(overFifty.status).toBe(200);
		expect(overFifty.body.estimatedShippingCost).toBe(0);
	});

	it("serves all four cart endpoints without country or postcode parameters", async () => {
		const cartId = newCartId();
		const empty = await request(app).get("/api/cart").set("X-Cart-Id", cartId);
		const added = await add(cartId, productIds.below);
		const updated = await request(app)
			.patch(`/api/cart/items/${productIds.below}`)
			.set("X-Cart-Id", cartId)
			.send({ quantity: 2 });
		const removed = await request(app)
			.delete(`/api/cart/items/${productIds.below}`)
			.set("X-Cart-Id", cartId);

		for (const response of [empty, added, updated, removed]) {
			expect(response.status).toBe(200);
			expect(response.body).toHaveProperty("estimatedShippingCost");
		}
		expect(updated.body.items[0].quantity).toBe(2);
		expect(removed.body).toEqual({
			items: [],
			estimatedShippingCost: 0,
		});
	});

	it("keeps cart contents isolated by X-Cart-Id", async () => {
		const firstCartId = newCartId();
		const secondCartId = newCartId();
		await add(firstCartId, productIds.below);

		const firstCart = await request(app)
			.get("/api/cart")
			.set("X-Cart-Id", firstCartId);
		const secondCart = await request(app)
			.get("/api/cart")
			.set("X-Cart-Id", secondCartId);

		expect(firstCart.body.items).toHaveLength(1);
		expect(secondCart.body).toEqual({
			items: [],
			estimatedShippingCost: 0,
		});
	});

	it("preserves invalid-header, quantity-limit, unknown-product, and unpriced-product errors", async () => {
		const invalidHeader = await request(app).get("/api/cart");
		expect(invalidHeader.status).toBe(400);

		const cartId = newCartId();
		const invalidQuantity = await add(cartId, productIds.below, 0);
		expect(invalidQuantity.status).toBe(400);

		const unknownProduct = await add(cartId, "missing-integration-product");
		expect(unknownProduct.status).toBe(404);
		expect(unknownProduct.body).toEqual({ error: "Product not found" });

		const unpricedProduct = await add(cartId, productIds.unpriced);
		expect(unpricedProduct.status).toBe(409);

		const missingCartItem = await request(app)
			.patch(`/api/cart/items/${productIds.below}`)
			.set("X-Cart-Id", cartId)
			.send({ quantity: 2 });
		expect(missingCartItem.status).toBe(404);
		expect(missingCartItem.body).toEqual({
			error: "Product not found in cart",
		});
	});

	it("enforces the database quantity limit for real cart writes", async () => {
		const cartId = newCartId();
		const maximum = await add(cartId, productIds.penny, MAX_CART_QUANTITY);
		expect(maximum.status).toBe(200);
		expect(maximum.body.items[0].quantity).toBe(MAX_CART_QUANTITY);

		const overflow = await add(cartId, productIds.penny);
		expect(overflow.status).toBe(400);
	});
});
