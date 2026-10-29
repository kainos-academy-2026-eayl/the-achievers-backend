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

<<<<<<< HEAD
	it("calculates the threshold from every item in the cart", async () => {
		const cartId = newCartId();
		await add(cartId, productIds.quarter);
		await add(cartId, productIds.quarter);
		const exactlyFifty = await request(app)
=======
	it.each(endpoints)(
		"requires a UK shipping destination for %s %s",
		async (method, path) => {
			const response = await request(context.app)
				[method](path)
				.set("X-Cart-Id", cartId);
			expect(response.status).toBe(400);
			expect(response.body.error).toBe(
				"A UK shipping country and postcode are required",
			);
			expect(context.repository.findByCartId).not.toHaveBeenCalled();
			expect(context.repository.add).not.toHaveBeenCalled();
			expect(context.repository.setQuantity).not.toHaveBeenCalled();
			expect(context.repository.remove).not.toHaveBeenCalled();
		},
	);

	it("rejects shipping destinations outside the UK", async () => {
		const response = await request(context.app)
			.get("/api/cart?country=US&postcode=10001")
			.set("X-Cart-Id", cartId);
		expect(response.status).toBe(400);
		expect(response.body).toEqual({
			error: "Shipping is only available to UK destinations",
		});
		expect(context.repository.findByCartId).not.toHaveBeenCalled();
	});

	it.each([0, -1, 1.5, "2", null, undefined, MAX_CART_QUANTITY + 1])(
		"rejects invalid quantity %s for both add and update",
		async (quantity) => {
			for (const [method, path] of endpoints.slice(1, 3)) {
				const response = await request(context.app)
					[method](withDestination(path))
					.set("X-Cart-Id", cartId)
					.send({ productId: product.id, quantity });
				expect(response.status).toBe(400);
			}
			expect(context.repository.add).not.toHaveBeenCalled();
			expect(context.repository.setQuantity).not.toHaveBeenCalled();
		},
	);

	it.each([{}, { productId: "" }, { productId: " " }, { productId: 3 }, []])(
		"rejects invalid add bodies %j",
		async (body) => {
			const response = await request(context.app)
				.post(withDestination("/api/cart/items"))
				.set("X-Cart-Id", cartId)
				.send(body);
			expect(response.status).toBe(400);
			expect(context.repository.add).not.toHaveBeenCalled();
		},
	);

	it("rejects malformed JSON", async () => {
		const response = await request(context.app)
			.post(withDestination("/api/cart/items"))
			.set("X-Cart-Id", cartId)
			.set("Content-Type", "application/json")
			.send("{ invalid");
		expect(response.status).toBe(400);
	});

	it.each(["post", "patch"] as const)(
		"returns 404 for an unknown product on %s",
		async (method) => {
			context.products.findById.mockResolvedValue(null);
			const response = await request(context.app)
				[method](
					withDestination(
						method === "post" ? "/api/cart/items" : "/api/cart/items/missing",
					),
				)
				.set("X-Cart-Id", cartId)
				.send({ productId: "missing", quantity: 1 });
			expect(response.status).toBe(404);
			expect(response.body).toEqual({ error: "Product not found" });
		},
	);

	it.each([null, -1])(
		"rejects an unpurchasable price %s",
		async (pricePence) => {
			context.products.findById.mockResolvedValue({ ...product, pricePence });
			const response = await request(context.app)
				.post(withDestination("/api/cart/items"))
				.set("X-Cart-Id", cartId)
				.send({ productId: product.id, quantity: 1 });
			expect(response.status).toBe(409);
			expect(context.repository.add).not.toHaveBeenCalled();
		},
	);

	it("reports an unavailable price on an existing cart item", async () => {
		context.repository.findByCartId.mockResolvedValue([
			{ ...item, product: { ...product, pricePence: null } },
		]);
		const response = await request(context.app)
			.get(withDestination("/api/cart"))
			.set("X-Cart-Id", cartId);
		expect(response.status).toBe(409);
	});

	it("returns 404 rather than adding an item during PATCH", async () => {
		context.repository.setQuantity.mockResolvedValue(false);
		const response = await request(context.app)
			.patch(withDestination(`/api/cart/items/${product.id}`))
			.set("X-Cart-Id", cartId)
			.send({ quantity: 3 });
		expect(response.status).toBe(404);
		expect(response.body).toEqual({ error: "Product not found in cart" });
	});

	it("returns 400 when adding units exceeds the database integer limit", async () => {
		context.repository.add.mockRejectedValue(
			new CartError("Quantity limit exceeded", 400),
		);
		const response = await request(context.app)
			.post(withDestination("/api/cart/items"))
			.set("X-Cart-Id", cartId)
			.send({ productId: product.id, quantity: 1 });
		expect(response.status).toBe(400);
	});

	it.each(endpoints)(
		"logs database failures without exposing details on %s",
		async (method, path) => {
			const error = new Error("private database connection details");
			const log = vi.spyOn(console, "error").mockImplementation(() => {});
			context.repository.findByCartId.mockRejectedValue(error);
			const response = await request(context.app)
				[method](withDestination(path))
				.set("X-Cart-Id", cartId)
				.send({ productId: product.id, quantity: 1 });
			expect(response.status).toBe(500);
			expect(response.body).toEqual({ error: "Internal server error" });
			expect(log).toHaveBeenCalledWith("Unhandled request error", error);
			log.mockRestore();
		},
	);
});

describe("frontend CORS", () => {
	it.each(["GET", "POST", "PATCH", "DELETE"])(
		"allows the frontend's %s preflight with X-Cart-Id",
		async (method) => {
			const { app } = setup();
			const response = await request(app)
				.options("/api/cart/items/cue-1")
				.set("Origin", "http://localhost:8000")
				.set("Access-Control-Request-Method", method)
				.set("Access-Control-Request-Headers", "content-type,x-cart-id");
			expect(response.status).toBe(204);
			expect(response.headers["access-control-allow-origin"]).toBe(
				"http://localhost:8000",
			);
			expect(response.headers["access-control-allow-methods"]).toContain(
				method,
			);
			expect(response.headers["access-control-allow-headers"]).toContain(
				"X-Cart-Id",
			);
		},
	);

	it("includes CORS headers on actual responses including errors", async () => {
		const { app } = setup();
		const response = await request(app)
>>>>>>> 5f52428e715a04284673e7c24ad92faa43710f99
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
