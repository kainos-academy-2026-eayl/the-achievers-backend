import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app";
import { Prisma } from "../src/generated/prisma/client";

const noRegistration = { register: vi.fn() };

describe("GET /api/products", () => {
	it("returns all products with prices as numbers", async () => {
		const getAll = vi.fn().mockResolvedValue([
			{
				id: "calluminator",
				name: "Calluminator",
				description: "The precision automated pool cue.",
				category: "Calluminator Range",
				price: new Prisma.Decimal("1499.99"),
				rating: 4.8,
				reviewCount: 312,
			},
			{
				id: "laser-training-aid",
				name: "Laser Alignment Training Aid",
				description: null,
				category: "Accessories",
				price: null,
				rating: null,
				reviewCount: 0,
			},
		]);
		const app = createApp(noRegistration, { getAll });

		const response = await request(app).get("/api/products");

		expect(response.status).toBe(200);
		expect(response.body).toEqual([
			{
				id: "calluminator",
				name: "Calluminator",
				description: "The precision automated pool cue.",
				category: "Calluminator Range",
				price: 1499.99,
				rating: 4.8,
				reviewCount: 312,
			},
			{
				id: "laser-training-aid",
				name: "Laser Alignment Training Aid",
				description: null,
				category: "Accessories",
				price: null,
				rating: null,
				reviewCount: 0,
			},
		]);
	});

	it("returns an empty list when there are no products", async () => {
		const app = createApp(noRegistration, { getAll: async () => [] });

		const response = await request(app).get("/api/products");

		expect(response.status).toBe(200);
		expect(response.body).toEqual([]);
	});

	it("returns a 500 without leaking details when the database fails", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		const getAll = vi.fn().mockRejectedValue(new Error("connection refused"));
		const app = createApp(noRegistration, { getAll });

		const response = await request(app).get("/api/products");

		expect(response.status).toBe(500);
		expect(response.body).toEqual({ error: "Internal server error" });
	});
});
