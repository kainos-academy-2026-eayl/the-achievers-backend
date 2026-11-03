import { PrismaPg } from "@prisma/adapter-pg";
import { SignJWT } from "jose";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app";
import { parseCreateProductDto } from "../src/dtos/createProductDto";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaProductRepository } from "../src/products/productRepository";
import { ProductService } from "../src/products/productService";
import { noCart } from "./helpers";

const secret = "test-only-product-creation-signing-secret";
const input = {
	name: "Maple Cue",
	description: "A balanced maple cue.",
	category: "Cues",
	price: "89.99",
};
const product = {
	id: "test-product",
	name: input.name,
	description: input.description,
	category: input.category,
	pricePence: 8999,
	rating: null,
	reviewCount: 0,
};

async function token(
	options: {
		role?: string;
		secret?: string;
		expiresIn?: string;
		issuer?: string;
		audience?: string;
	} = {},
) {
	return new SignJWT({ role: options.role ?? "admin" })
		.setProtectedHeader({ alg: "HS256" })
		.setSubject("1")
		.setIssuer(options.issuer ?? "the-achievers-backend")
		.setAudience(options.audience ?? "the-achievers-api")
		.setExpirationTime(options.expiresIn ?? "1h")
		.sign(new TextEncoder().encode(options.secret ?? secret));
}

function setup() {
	const prisma = new PrismaClient({
		adapter: new PrismaPg({ connectionString: "postgresql://localhost/test" }),
	});
	const create = vi.spyOn(prisma.product, "create").mockResolvedValue(product);
	const service = new ProductService(new PrismaProductRepository(prisma));
	const app = createApp(
		{ register: vi.fn() },
		service,
		{ login: vi.fn() },
		noCart,
		undefined,
		undefined,
		{ service, jwtSecret: secret },
	);
	return { app, create };
}

afterEach(() => vi.restoreAllMocks());

describe("POST /api/products", () => {
	it("creates a product with a generated ID, exact pence and catalogue response", async () => {
		const { app, create } = setup();
		const response = await request(app)
			.post("/api/products")
			.set("Authorization", `Bearer ${await token()}`)
			.send({
				...input,
				name: ` ${input.name} `,
				description: ` ${input.description} `,
				category: ` ${input.category} `,
				id: "client-selected-id",
				stock: 100,
				rating: 5,
				reviewCount: 100,
				pricePence: 1,
			})
			.expect(201);
		expect(create).toHaveBeenCalledExactlyOnceWith({
			data: {
				id: expect.stringMatching(
					/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
				),
				name: input.name,
				description: input.description,
				category: input.category,
				pricePence: 8999,
			},
		});
		expect(response.body).toEqual({
			id: product.id,
			...input,
			price: 89.99,
			rating: null,
			reviewCount: 0,
		});
		expect(response.headers.location).toBe("/api/products/test-product");
		expect(response.headers["cache-control"]).toBe("no-store");
	});

	it("generates distinct IDs even for products with the same name", async () => {
		const { app, create } = setup();
		const authorization = `Bearer ${await token()}`;
		for (let i = 0; i < 2; i++) {
			await request(app)
				.post("/api/products")
				.set("Authorization", authorization)
				.send(input)
				.expect(201);
		}
		expect(create.mock.calls[0]?.[0].data.id).not.toBe(
			create.mock.calls[1]?.[0].data.id,
		);
	});

	it.each([
		{},
		{ name: "" },
		{ name: " " },
		{ name: 123 },
		{ name: ["Cue"] },
		{ name: "n".repeat(201) },
		{ description: "" },
		{ description: " " },
		{ description: null },
		{ description: "d".repeat(2001) },
		{ category: "" },
		{ category: {} },
		{ category: "c".repeat(101) },
		{ price: "" },
		{ price: null },
		{ price: true },
		{ price: ["1"] },
		{ price: "-0.01" },
		{ price: "1.001" },
		{ price: "1e2" },
		{ price: "12abc" },
		{ price: "Infinity" },
		{ price: "21474836.48" },
		{ price: 21474836.48 },
	])("rejects invalid fields %j without saving", async (changes) => {
		const { app, create } = setup();
		const response = await request(app)
			.post("/api/products")
			.set("Authorization", `Bearer ${await token()}`)
			.send(Object.keys(changes).length ? { ...input, ...changes } : {})
			.expect(400);
		expect(response.body.error).toBe("Validation failed");
		expect(Object.keys(response.body.fieldErrors).length).toBeGreaterThan(0);
		expect(create).not.toHaveBeenCalled();
	});

	it.each([null, [], "not an object"])(
		"rejects non-object JSON %j without saving",
		async (body) => {
			const { app, create } = setup();
			await request(app)
				.post("/api/products")
				.set("Authorization", `Bearer ${await token()}`)
				.set("Content-Type", "application/json")
				.send(JSON.stringify(body))
				.expect(400);
			expect(create).not.toHaveBeenCalled();
		},
	);

	it("rejects malformed or oversized requests without saving", async () => {
		const { app, create } = setup();
		const authorization = `Bearer ${await token()}`;
		await request(app)
			.post("/api/products")
			.set("Authorization", authorization)
			.set("Content-Type", "application/json")
			.send("{invalid")
			.expect(400);
		await request(app)
			.post("/api/products")
			.set("Authorization", authorization)
			.send({ ...input, description: "d".repeat(11000) })
			.expect(413);
		expect(create).not.toHaveBeenCalled();
	});

	it("requires an authentic, unexpired admin token before saving", async () => {
		const { app, create } = setup();
		const headers = [
			undefined,
			"Bearer invalid",
			`Bearer ${await token({ expiresIn: "-10s" })}`,
			`Bearer ${await token({ secret: "another-signing-secret" })}`,
			`Bearer ${await token({ issuer: "another-issuer" })}`,
			`Bearer ${await token({ audience: "another-audience" })}`,
		];
		for (const authorization of headers) {
			const req = request(app).post("/api/products").send(input);
			if (authorization) req.set("Authorization", authorization);
			await req.expect(401);
		}
		await request(app)
			.post("/api/products")
			.set("Authorization", `Bearer ${await token({ role: "user" })}`)
			.send(input)
			.expect(403);
		expect(create).not.toHaveBeenCalled();
	});

	it("logs failures without exposing database details or claiming creation", async () => {
		const { app, create } = setup();
		const error = new Error("private database failure");
		create.mockRejectedValue(error);
		const log = vi.spyOn(console, "error").mockImplementation(() => {});
		const response = await request(app)
			.post("/api/products")
			.set("Authorization", `Bearer ${await token()}`)
			.send(input)
			.expect(500);
		expect(response.body).toEqual({ error: "Internal server error" });
		expect(log).toHaveBeenCalledWith("Unhandled request error", error);
		expect(response.headers.location).toBeUndefined();
	});
});

describe("Product creation validation", () => {
	it.each([
		["0", 0],
		["0.00", 0],
		["0.01", 1],
		["0.29", 29],
		[0.29, 29],
		["1.1", 110],
		[" 19.99 ", 1999],
		[19.99, 1999],
		["21474836.47", 2147483647],
		[21474836.47, 2147483647],
	])("converts %s to exactly %s pence", (price, pricePence) => {
		expect(parseCreateProductDto({ ...input, price })).toEqual({
			success: true,
			data: {
				name: input.name,
				description: input.description,
				category: input.category,
				pricePence,
			},
		});
	});

	it("accepts maximum text lengths", () => {
		const result = parseCreateProductDto({
			...input,
			name: "n".repeat(200),
			description: "d".repeat(2000),
			category: "c".repeat(100),
		});
		expect(result.success).toBe(true);
	});

	it.each([NaN, Infinity, -Infinity, 0.001])(
		"rejects invalid numeric price %s",
		(price) => {
			expect(parseCreateProductDto({ ...input, price }).success).toBe(false);
		},
	);
});
