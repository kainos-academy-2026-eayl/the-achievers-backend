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
	if (!process.env.DATABASE_URL) return;

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
					pricePence: 19_999,
				},
				{
					id: productIds.exact,
					name: "Integration Product At Threshold",
					category: "Integration",
					pricePence: 20_000,
				},
				{
					id: productIds.above,
					name: "Integration Product Above Threshold",
					category: "Integration",
					pricePence: 20_001,
				},
				{
					id: productIds.quarter,
					name: "Integration Quarter Product",
					category: "Integration",
					pricePence: 10_000,
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
			name: "£199.99",
			productId: productIds.below,
			price: 199.99,
			shipping: 4.99,
		},
		{
			name: "£200.00",
			productId: productIds.exact,
			price: 200,
			shipping: 4.99,
		},
		{
			name: "£200.01",
			productId: productIds.above,
			price: 200.01,
			shipping: 0,
		},
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
		const exactlyTwoHundred = await request(app)
			.get("/api/cart")
			.set("X-Cart-Id", cartId);

		expect(exactlyTwoHundred.status).toBe(200);
		expect(exactlyTwoHundred.body.estimatedShippingCost).toBe(4.99);

		const overTwoHundred = await add(cartId, productIds.penny);
		expect(overTwoHundred.status).toBe(200);
		expect(overTwoHundred.body.estimatedShippingCost).toBe(0);
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

	it("enforces the quantity limit for real cart writes without changing the cart on failure", async () => {
		const cartId = newCartId();
		const initial = await add(cartId, productIds.penny, MAX_CART_QUANTITY - 1);
		expect(initial.status).toBe(200);

		const maximum = await add(cartId, productIds.penny);
		expect(maximum.status).toBe(200);
		expect(maximum.body.items[0].quantity).toBe(99);

		const overflow = await add(cartId, productIds.penny);
		expect(overflow.status).toBe(400);

		const cart = await request(app).get("/api/cart").set("X-Cart-Id", cartId);
		expect(cart.status).toBe(200);
		expect(cart.body.items[0].quantity).toBe(99);
	});

	it("accepts 99 and rejects 100 for both add and update requests", async () => {
		const cartId = newCartId();
		const invalidAdd = await add(cartId, productIds.penny, 100);
		expect(invalidAdd.status).toBe(400);

		const maximum = await add(cartId, productIds.penny, 99);
		expect(maximum.status).toBe(200);
		expect(maximum.body.items[0].quantity).toBe(99);

		const validUpdate = await request(app)
			.patch(`/api/cart/items/${productIds.penny}`)
			.set("X-Cart-Id", cartId)
			.send({ quantity: 99 });
		expect(validUpdate.status).toBe(200);
		expect(validUpdate.body.items[0].quantity).toBe(99);

		const invalidUpdate = await request(app)
			.patch(`/api/cart/items/${productIds.penny}`)
			.set("X-Cart-Id", cartId)
			.send({ quantity: 100 });
		expect(invalidUpdate.status).toBe(400);

		const cart = await request(app).get("/api/cart").set("X-Cart-Id", cartId);
		expect(cart.status).toBe(200);
		expect(cart.body.items[0].quantity).toBe(99);
	});

	it("does not exceed 99 when units are added concurrently", async () => {
		const cartId = newCartId();
		const initial = await add(cartId, productIds.penny, 98);
		expect(initial.status).toBe(200);

		const responses = await Promise.all([
			add(cartId, productIds.penny),
			add(cartId, productIds.penny),
		]);
		expect(responses.map((response) => response.status).sort()).toEqual([
			200, 400,
		]);

		const cart = await request(app).get("/api/cart").set("X-Cart-Id", cartId);
		expect(cart.status).toBe(200);
		expect(cart.body.items[0].quantity).toBe(99);
	});
});
