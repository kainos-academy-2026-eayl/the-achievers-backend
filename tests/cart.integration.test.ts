import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import request from "supertest";
import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { createApp } from "../src/app";
import { PrismaCartRepository } from "../src/cart/cartRepository";
import { CartService } from "../src/cart/cartService";
import { MAX_CART_QUANTITY } from "../src/dtos/cartDto";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaProductRepository } from "../src/products/productRepository";
import { ProductService } from "../src/products/productService";

const databaseUrl = process.env.CART_TEST_DATABASE_URL;

describe.skipIf(!databaseUrl)("cart PostgreSQL integration", () => {
	let prisma: PrismaClient;
	let app: ReturnType<typeof createApp>;
	const cartId = randomUUID();
	const otherCartId = randomUUID();
	const cueId = `cart-test-cue-${randomUUID()}`;
	const caseId = `cart-test-case-${randomUUID()}`;
	const noPriceId = `cart-test-unpriced-${randomUUID()}`;

	beforeAll(async () => {
		if (!databaseUrl) throw new Error("CART_TEST_DATABASE_URL is required");
		prisma = new PrismaClient({
			adapter: new PrismaPg({ connectionString: databaseUrl }),
		});
		const products = new PrismaProductRepository(prisma);
		app = createApp(
			{ register: vi.fn() },
			new ProductService(products),
			new CartService(new PrismaCartRepository(prisma), products),
		);
		await prisma.product.createMany({
			data: [
				{
					id: cueId,
					name: "Pro Series Maple Cue",
					category: "Cues",
					pricePence: 8999,
				},
				{ id: caseId, name: "Cue Case", category: "Cases", pricePence: 2500 },
				{ id: noPriceId, name: "Coming Soon", category: "Cues" },
			],
		});
	});

	beforeEach(async () => {
		await prisma.cartItem.deleteMany({
			where: { cartId: { in: [cartId, otherCartId] } },
		});
	});

	afterAll(async () => {
		if (!prisma) return;
		try {
			await prisma.product.deleteMany({
				where: { id: { in: [cueId, caseId, noPriceId] } },
			});
		} finally {
			await prisma.$disconnect();
		}
	});

	function add(productId: string, quantity: number, id = cartId) {
		return request(app)
			.post("/api/cart/items")
			.set("X-Cart-Id", id)
			.send({ productId, quantity });
	}

	it("persists adds, displays correct totals, updates quantities, and removes the last item", async () => {
		expect(
			(await request(app).get("/api/cart").set("X-Cart-Id", cartId)).body,
		).toEqual({ items: [] });
		expect((await add(cueId, 1)).status).toBe(200);
		expect((await add(cueId, 1)).body.items).toEqual([
			{
				product: { id: cueId, name: "Pro Series Maple Cue", price: 89.99 },
				quantity: 2,
			},
		]);
		const withCase = await add(caseId, 3);
		expect(withCase.status).toBe(200);
		expect(withCase.body.items).toHaveLength(2);
		const total = withCase.body.items.reduce(
			(sum: number, item: { product: { price: number }; quantity: number }) =>
				sum + item.product.price * item.quantity,
			0,
		);
		expect(total).toBeCloseTo(254.98, 2);

		// A fresh service reads the database, not process-local cart state.
		const freshService = new CartService(
			new PrismaCartRepository(prisma),
			new PrismaProductRepository(prisma),
		);
		expect(await freshService.get(cartId)).toEqual(withCase.body);

		const updated = await request(app)
			.patch(`/api/cart/items/${cueId}`)
			.set("X-Cart-Id", cartId)
			.send({ quantity: 3 });
		expect(updated.status).toBe(200);
		expect(
			updated.body.items.find(
				(item: { product: { id: string } }) => item.product.id === cueId,
			).quantity,
		).toBe(3);
		expect(
			await prisma.cartItem.findUnique({
				where: { cartId_productId: { cartId, productId: cueId } },
			}),
		).toMatchObject({ quantity: 3 });
		const remaining = await request(app)
			.delete(`/api/cart/items/${cueId}`)
			.set("X-Cart-Id", cartId);
		expect(remaining.body.items).toHaveLength(1);
		const empty = await request(app)
			.delete(`/api/cart/items/${caseId}`)
			.set("X-Cart-Id", cartId);
		expect(empty.status).toBe(200);
		expect(empty.body).toEqual({ items: [] });
		expect(
			(
				await request(app)
					.delete(`/api/cart/items/${caseId}`)
					.set("X-Cart-Id", cartId)
			).body,
		).toEqual({ items: [] });
	});

	it("isolates reads, updates and deletes between carts", async () => {
		await add(cueId, 2);
		expect(
			(await request(app).get("/api/cart").set("X-Cart-Id", otherCartId)).body,
		).toEqual({ items: [] });
		expect(
			(
				await request(app)
					.patch(`/api/cart/items/${cueId}`)
					.set("X-Cart-Id", otherCartId)
					.send({ quantity: 9 })
			).status,
		).toBe(404);
		await request(app)
			.delete(`/api/cart/items/${cueId}`)
			.set("X-Cart-Id", otherCartId);
		await add(cueId, 5, otherCartId);
		const original = await request(app)
			.get("/api/cart")
			.set("X-Cart-Id", cartId);
		expect(original.body.items[0].quantity).toBe(2);
	});

	it("does not lose units during concurrent first adds", async () => {
		const responses = await Promise.all(
			Array.from({ length: 12 }, () => add(cueId, 1)),
		);
		expect(responses.every((response) => response.status === 200)).toBe(true);
		const response = await request(app)
			.get("/api/cart")
			.set("X-Cart-Id", cartId);
		expect(response.body.items).toHaveLength(1);
		expect(response.body.items[0].quantity).toBe(12);
	});

	it("uses current database prices instead of a cached price", async () => {
		await add(cueId, 1);
		try {
			await prisma.product.update({
				where: { id: cueId },
				data: { pricePence: 9999 },
			});
			const response = await request(app)
				.get("/api/cart")
				.set("X-Cart-Id", cartId);
			expect(response.body.items[0].product.price).toBe(99.99);
		} finally {
			await prisma.product.update({
				where: { id: cueId },
				data: { pricePence: 8999 },
			});
		}
	});

	it("rejects quantity overflow atomically without changing the cart", async () => {
		expect((await add(cueId, MAX_CART_QUANTITY)).status).toBe(200);
		expect((await add(cueId, 1)).status).toBe(400);
		const response = await request(app)
			.get("/api/cart")
			.set("X-Cart-Id", cartId);
		expect(response.body.items[0].quantity).toBe(MAX_CART_QUANTITY);
	});

	it("rejects unknown and unpriced products without storing them", async () => {
		expect((await add("does-not-exist", 1)).status).toBe(404);
		expect((await add(noPriceId, 1)).status).toBe(409);
		expect(await prisma.cartItem.count({ where: { cartId } })).toBe(0);
	});

	it("rolls back additions when another cart item has no price", async () => {
		await prisma.cartItem.create({
			data: { cartId, productId: noPriceId, quantity: 2 },
		});

		expect((await add(cueId, 1)).status).toBe(409);
		expect((await add(cueId, 1)).status).toBe(409);

		expect(
			await prisma.cartItem.findUnique({
				where: { cartId_productId: { cartId, productId: cueId } },
			}),
		).toBeNull();
		expect(
			await prisma.cartItem.findUnique({
				where: { cartId_productId: { cartId, productId: noPriceId } },
			}),
		).toMatchObject({ quantity: 2 });
	});

	it("enforces the positive quantity constraint in PostgreSQL", async () => {
		await expect(
			prisma.cartItem.create({
				data: { cartId, productId: cueId, quantity: 0 },
			}),
		).rejects.toThrow();
		expect(await prisma.cartItem.count({ where: { cartId } })).toBe(0);
	});

	it("removes cart entries when their product is deleted", async () => {
		const deletedProductId = `cart-test-deleted-${randomUUID()}`;
		await prisma.product.create({
			data: {
				id: deletedProductId,
				name: "Discontinued Cue",
				category: "Cues",
				pricePence: 1000,
			},
		});
		try {
			expect((await add(deletedProductId, 1)).status).toBe(200);
			await prisma.product.delete({ where: { id: deletedProductId } });
			const response = await request(app)
				.get("/api/cart")
				.set("X-Cart-Id", cartId);
			expect(response.status).toBe(200);
			expect(response.body).toEqual({ items: [] });
		} finally {
			await prisma.product.deleteMany({ where: { id: deletedProductId } });
		}
	});
});
