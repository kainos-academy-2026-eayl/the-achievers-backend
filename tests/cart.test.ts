import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app";
import type { CartRepository } from "../src/cart/cartRepository";
import { CartService } from "../src/cart/cartService";
import { MAX_CART_QUANTITY } from "../src/dtos/cartDto";
import { CartError } from "../src/errors/cartError";
import type { Product } from "../src/generated/prisma/client";

const cartId = "8d0822af-42b7-4358-8dcd-88eabb610a30";
const product: Product = {
	id: "cue-1",
	name: "Pro Series Maple Cue",
	description: null,
	category: "Cues",
	pricePence: 8999,
	rating: null,
	reviewCount: 0,
};
const item = { cartId, productId: product.id, product, quantity: 2 };

function setup() {
	const repository = {
		findByCartId: vi.fn<CartRepository["findByCartId"]>().mockResolvedValue([]),
		add: vi.fn<CartRepository["add"]>().mockResolvedValue(undefined),
		setQuantity: vi.fn<CartRepository["setQuantity"]>().mockResolvedValue(true),
		remove: vi.fn<CartRepository["remove"]>().mockResolvedValue(undefined),
	};
	const transactionalRepository: CartRepository = {
		...repository,
		transaction: (work) => work(transactionalRepository),
	};
	const products = { findById: vi.fn().mockResolvedValue(product) };
	const service = new CartService(transactionalRepository, products);
	const app = createApp(
		{ register: vi.fn() },
		{ getAll: vi.fn(), getById: vi.fn() },
		service,
	);
	return { repository, products, service, app };
}

describe("cart API", () => {
	let context: ReturnType<typeof setup>;
	beforeEach(() => {
		context = setup();
	});

	it("returns the exact frontend response with a price in pounds", async () => {
		context.repository.findByCartId.mockResolvedValue([item]);
		const response = await request(context.app)
			.get("/api/cart")
			.set("X-Cart-Id", cartId.toUpperCase());

		expect(response.status).toBe(200);
		expect(response.body).toEqual({
			items: [
				{
					product: { id: product.id, name: product.name, price: 89.99 },
					quantity: 2,
				},
			],
		});
		expect(context.repository.findByCartId).toHaveBeenCalledWith(cartId);
	});

	it("returns 200 and an empty list for a new cart", async () => {
		const response = await request(context.app)
			.get("/api/cart")
			.set("X-Cart-Id", cartId);
		expect(response.status).toBe(200);
		expect(response.body).toEqual({ items: [] });
	});

	it("adds units and ignores browser-supplied product information", async () => {
		context.repository.findByCartId.mockResolvedValue([item]);
		const response = await request(context.app)
			.post("/api/cart/items")
			.set("X-Cart-Id", cartId)
			.send({
				productId: product.id,
				quantity: 2,
				price: 0.01,
				name: "Fake product",
				product: { price: 0.01 },
			});
		expect(response.status).toBe(200);
		expect(response.body.items[0].product).toEqual({
			id: product.id,
			name: product.name,
			price: 89.99,
		});
		expect(context.products.findById).toHaveBeenCalledWith(product.id);
		expect(context.repository.add).toHaveBeenCalledWith(cartId, product.id, 2);
	});

	it("sets the quantity and returns the updated cart", async () => {
		context.repository.findByCartId.mockResolvedValue([
			{ ...item, quantity: 3 },
		]);
		const response = await request(context.app)
			.patch(`/api/cart/items/${product.id}`)
			.set("X-Cart-Id", cartId)
			.send({ quantity: 3 });
		expect(response.status).toBe(200);
		expect(response.body.items[0].quantity).toBe(3);
		expect(context.repository.setQuantity).toHaveBeenCalledWith(
			cartId,
			product.id,
			3,
		);
	});

	it("removes the last item and returns an empty cart", async () => {
		const response = await request(context.app)
			.delete(`/api/cart/items/${product.id}`)
			.set("X-Cart-Id", cartId);
		expect(response.status).toBe(200);
		expect(response.body).toEqual({ items: [] });
		expect(context.repository.remove).toHaveBeenCalledWith(cartId, product.id);
	});

	const endpoints = [
		["get", "/api/cart"],
		["post", "/api/cart/items"],
		["patch", "/api/cart/items/cue-1"],
		["delete", "/api/cart/items/cue-1"],
	] as const;

	it.each(endpoints)(
		"requires a UUID header for %s %s",
		async (method, path) => {
			for (const header of [undefined, "not-a-uuid", `${cartId},${cartId}`]) {
				const pending = request(context.app)[method](path);
				if (header !== undefined) pending.set("X-Cart-Id", header);
				const response = await pending.send({
					productId: product.id,
					quantity: 1,
				});
				expect(response.status).toBe(400);
				expect(response.body.error).toBe("X-Cart-Id must be a valid UUID");
			}
			expect(context.repository.findByCartId).not.toHaveBeenCalled();
			expect(context.repository.add).not.toHaveBeenCalled();
			expect(context.repository.setQuantity).not.toHaveBeenCalled();
			expect(context.repository.remove).not.toHaveBeenCalled();
		},
	);

	it.each([0, -1, 1.5, "2", null, undefined, MAX_CART_QUANTITY + 1])(
		"rejects invalid quantity %s for both add and update",
		async (quantity) => {
			for (const [method, path] of endpoints.slice(1, 3)) {
				const response = await request(context.app)
					[method](path)
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
				.post("/api/cart/items")
				.set("X-Cart-Id", cartId)
				.send(body);
			expect(response.status).toBe(400);
			expect(context.repository.add).not.toHaveBeenCalled();
		},
	);

	it("rejects malformed JSON", async () => {
		const response = await request(context.app)
			.post("/api/cart/items")
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
					method === "post" ? "/api/cart/items" : "/api/cart/items/missing",
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
				.post("/api/cart/items")
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
			.get("/api/cart")
			.set("X-Cart-Id", cartId);
		expect(response.status).toBe(409);
	});

	it("returns 404 rather than adding an item during PATCH", async () => {
		context.repository.setQuantity.mockResolvedValue(false);
		const response = await request(context.app)
			.patch(`/api/cart/items/${product.id}`)
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
			.post("/api/cart/items")
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
				[method](path)
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
			.get("/api/cart")
			.set("Origin", "http://localhost:8000");
		expect(response.status).toBe(400);
		expect(response.headers["access-control-allow-origin"]).toBe(
			"http://localhost:8000",
		);
		expect(response.headers.vary).toContain("Origin");
	});

	it("does not allow arbitrary origins", async () => {
		const { app } = setup();
		const response = await request(app)
			.get("/api/cart")
			.set("Origin", "https://untrusted.example")
			.set("X-Cart-Id", cartId);
		expect(response.headers["access-control-allow-origin"]).toBeUndefined();
	});

	it("supports a configured frontend origin", async () => {
		const { service } = setup();
		const app = createApp(
			{ register: vi.fn() },
			{ getAll: vi.fn(), getById: vi.fn() },
			service,
			"https://shop.example",
		);
		const response = await request(app)
			.get("/api/cart")
			.set("X-Cart-Id", cartId)
			.set("Origin", "https://shop.example");
		expect(response.status).toBe(200);
		expect(response.headers["access-control-allow-origin"]).toBe(
			"https://shop.example",
		);
	});
});
