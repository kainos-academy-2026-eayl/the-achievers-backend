import { PrismaPg } from "@prisma/adapter-pg";
import { SignJWT } from "jose";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app";
import { parseUpdateProductDto } from "../src/dtos/updateProductDto";
import { Prisma, PrismaClient } from "../src/generated/prisma/client";
import { PrismaProductRepository } from "../src/products/productRepository";
import { ProductService } from "../src/products/productService";
import { noCart } from "./helpers";

const secret = "test-only-product-update-signing-secret";
const input = {
	name: "Updated Maple Cue",
	description: "An updated balanced cue.",
	category: "Premium Cues",
	price: "79.99",
	stock: 25,
};
const product = {
	id: "test-product",
	name: input.name,
	description: input.description,
	category: input.category,
	pricePence: 7999,
	stock: 25,
	rating: null,
	reviewCount: 0,
	images: [],
};

async function auth(
	options: {
		role?: string;
		secret?: string;
		expiresIn?: string;
		issuer?: string;
		audience?: string;
	} = {},
) {
	const token = await new SignJWT({ role: options.role ?? "admin" })
		.setProtectedHeader({ alg: "HS256" })
		.setSubject("1")
		.setIssuer(options.issuer ?? "the-achievers-backend")
		.setAudience(options.audience ?? "the-achievers-api")
		.setExpirationTime(options.expiresIn ?? "1h")
		.sign(new TextEncoder().encode(options.secret ?? secret));
	return ["Bearer", token].join(" ");
}

function setup() {
	const prisma = new PrismaClient({
		adapter: new PrismaPg({ connectionString: "postgresql://localhost/test" }),
	});
	const update = vi.spyOn(prisma.product, "update").mockResolvedValue(product);
	const find = vi
		.spyOn(prisma.product, "findUnique")
		.mockResolvedValue(product);
	const service = new ProductService(new PrismaProductRepository(prisma));
	const app = createApp(
		{ register: vi.fn() },
		service,
		{ login: vi.fn() },
		noCart,
		secret,
		undefined,
		undefined,
		{ service, jwtSecret: secret },
	);
	return { app, update, find };
}

afterEach(() => vi.restoreAllMocks());

describe("PUT /api/products/:id", () => {
	it("updates every editable field, preserving server-managed fields", async () => {
		const { app, update } = setup();
		const response = await request(app)
			.put(`/api/products/${product.id}`)
			.set("Authorization", await auth())
			.send({
				...input,
				name: ` ${input.name} `,
				id: "untrusted",
				rating: 5,
				reviewCount: 100,
				pricePence: 1,
			})
			.expect(200);
		expect(update).toHaveBeenCalledExactlyOnceWith({
			where: { id: product.id },
			data: {
				name: input.name,
				description: input.description,
				category: input.category,
				pricePence: 7999,
				stock: 25,
			},
			include: { images: { orderBy: { position: "asc" } } },
		});
		expect(response.body).toEqual({
			id: product.id,
			name: input.name,
			description: input.description,
			category: input.category,
			price: 79.99,
			stock: 25,
			inStock: true,
			rating: null,
			reviewCount: 0,
			images: [],
		});
		expect(response.headers["cache-control"]).toBe("no-store");
	});

	it.each(["name", "description", "category", "price", "stock"] as const)(
		"requires %s for a full replacement",
		async (field) => {
			const { app, update } = setup();
			const data: Partial<typeof input> = { ...input };
			delete data[field];
			const response = await request(app)
				.put(`/api/products/${product.id}`)
				.set("Authorization", await auth())
				.send(data)
				.expect(400);
			expect(response.body.fieldErrors[field]).toEqual(expect.any(String));
			expect(update).not.toHaveBeenCalled();
		},
	);

	it.each([
		{},
		{ name: "" },
		{ name: " " },
		{ name: ["Cue"] },
		{ name: "n".repeat(201) },
		{ description: "d".repeat(2001) },
		{ category: "c".repeat(101) },
		{ price: "" },
		{ price: null },
		{ price: true },
		{ price: "-0.01" },
		{ price: "1.001" },
		{ price: "1e2" },
		{ price: "12abc" },
		{ price: "21474836.48" },
		{ stock: -1 },
		{ stock: 2147483648 },
		{ stock: "not-a-number" },
		{ stock: 3.5 },
		{ stock: "1.5" },
		{ stock: "12abc" },
		{ stock: "1e2" },
		{ stock: "" },
		{ stock: null },
		{ stock: true },
		{ stock: ["1"] },
	])("rejects invalid input %j without saving", async (changes) => {
		const { app, update } = setup();
		const response = await request(app)
			.put(`/api/products/${product.id}`)
			.set("Authorization", await auth())
			.send(Object.keys(changes).length ? { ...input, ...changes } : {})
			.expect(400);
		expect(response.body.error).toBe("Validation failed");
		expect(Object.keys(response.body.fieldErrors).length).toBeGreaterThan(0);
		expect(update).not.toHaveBeenCalled();
	});

	it.each(["null", "[]", '"not an object"', "{invalid"])(
		"rejects non-object or malformed JSON %s",
		async (body) => {
			const { app, update } = setup();
			await request(app)
				.put(`/api/products/${product.id}`)
				.set("Authorization", await auth())
				.set("Content-Type", "application/json")
				.send(body)
				.expect(400);
			expect(update).not.toHaveBeenCalled();
		},
	);

	it("returns 404 for a missing product", async () => {
		const { app, update, find } = setup();
		find.mockResolvedValue(null);
		await request(app)
			.put("/api/products/missing")
			.set("Authorization", await auth())
			.send(input)
			.expect(404);
		expect(update).not.toHaveBeenCalled();
	});

	it("returns 404 if the product is deleted during the update", async () => {
		const { app, update } = setup();
		update.mockRejectedValue(
			new Prisma.PrismaClientKnownRequestError("Record not found", {
				code: "P2025",
				clientVersion: "test",
			}),
		);
		const response = await request(app)
			.put(`/api/products/${product.id}`)
			.set("Authorization", await auth())
			.send(input)
			.expect(404);
		expect(response.body).toEqual({ error: "Product not found" });
	});

	it("logs unexpected database failures and returns 500, not a misleading 404", async () => {
		const { app, update } = setup();
		const error = new Error("private database failure");
		update.mockRejectedValue(error);
		const log = vi.spyOn(console, "error").mockImplementation(() => {});
		const response = await request(app)
			.put(`/api/products/${product.id}`)
			.set("Authorization", await auth())
			.send(input)
			.expect(500);
		expect(response.body).toEqual({ error: "Internal server error" });
		expect(log).toHaveBeenCalledWith("Unhandled request error", error);
	});

	it("requires an authentic unexpired admin token", async () => {
		const { app, update } = setup();
		for (const authorization of [
			undefined,
			"Bearer",
			await auth({ expiresIn: "-10s" }),
			await auth({ secret: "wrong-secret" }),
			await auth({ issuer: "wrong-issuer" }),
			await auth({ audience: "wrong-audience" }),
		]) {
			const req = request(app).put(`/api/products/${product.id}`).send(input);
			if (authorization) req.set("Authorization", authorization);
			await req.expect(401);
		}
		await request(app)
			.put(`/api/products/${product.id}`)
			.set("Authorization", await auth({ role: "user" }))
			.send(input)
			.expect(403);
		expect(update).not.toHaveBeenCalled();
	});
});

describe("Product replacement validation", () => {
	it.each([
		["0", 0],
		["0.29", 29],
		[0.29, 29],
		["21474836.47", 2147483647],
	])("converts price %s to exactly %s pence", (price, pricePence) => {
		expect(parseUpdateProductDto({ ...input, price })).toEqual({
			success: true,
			data: {
				name: input.name,
				description: input.description,
				category: input.category,
				pricePence,
				stock: 25,
			},
		});
	});
	it.each([0, "0", " 25 ", 2147483647])("accepts integer stock %s", (stock) => {
		const result = parseUpdateProductDto({ ...input, stock });
		expect(result.success).toBe(true);
		if (result.success) expect(result.data.stock).toBe(Number(stock));
	});
	it("accepts maximum text lengths", () => {
		expect(
			parseUpdateProductDto({
				...input,
				name: "n".repeat(200),
				description: "d".repeat(2000),
				category: "c".repeat(100),
			}).success,
		).toBe(true);
	});
	it.each([NaN, Infinity, -Infinity])("rejects invalid stock %s", (stock) => {
		expect(parseUpdateProductDto({ ...input, stock }).success).toBe(false);
	});
});
