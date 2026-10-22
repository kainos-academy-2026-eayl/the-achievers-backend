import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app";

const noRegistration = { register: vi.fn() };
const getById = vi.fn();

describe("GET /api/products", () => {
	it("returns all products with prices as numbers", async () => {
		const getAll = vi.fn().mockResolvedValue([
			{
				id: "calluminator",
				name: "Calluminator",
				description: "The precision automated pool cue.",
				category: "Calluminator Range",
				pricePence: 149999,
				rating: 4.8,
				reviewCount: 312,
			},
			{
				id: "laser-training-aid",
				name: "Laser Alignment Training Aid",
				description: null,
				category: "Accessories",
				pricePence: null,
				rating: null,
				reviewCount: 0,
			},
		]);
		const app = createApp(noRegistration, { getAll, getById });

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
		const app = createApp(noRegistration, { getAll: async () => [], getById });

		const response = await request(app).get("/api/products");

		expect(response.status).toBe(200);
		expect(response.body).toEqual([]);
	});

	it("returns a 500 without leaking details when the database fails", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		const getAll = vi.fn().mockRejectedValue(new Error("connection refused"));
		const app = createApp(noRegistration, { getAll, getById });

		const response = await request(app).get("/api/products");

		expect(response.status).toBe(500);
		expect(response.body).toEqual({ error: "Internal server error" });
	});
});

describe("GET /api/products/:id", () => {
	const getAll = vi.fn();

	it("returns the product with the given id", async () => {
		const getById = vi.fn().mockResolvedValue({
			id: "calluminator",
			name: "Calluminator",
			description: "The precision automated pool cue.",
			category: "Calluminator Range",
			pricePence: 149999,
			rating: 4.8,
			reviewCount: 312,
		});
		const app = createApp(noRegistration, { getAll, getById });

		const response = await request(app).get("/api/products/calluminator");

		expect(response.status).toBe(200);
		expect(getById).toHaveBeenCalledWith("calluminator");
		expect(response.body).toEqual({
			id: "calluminator",
			name: "Calluminator",
			description: "The precision automated pool cue.",
			category: "Calluminator Range",
			price: 1499.99,
			rating: 4.8,
			reviewCount: 312,
		});
	});

	it("returns a 404 when the product does not exist", async () => {
		const getById = vi.fn().mockResolvedValue(null);
		const app = createApp(noRegistration, { getAll, getById });

		const response = await request(app).get("/api/products/does-not-exist");

		expect(response.status).toBe(404);
		expect(response.body).toEqual({ error: "Product not found" });
	});

	it("returns a 500 without leaking details when the database fails", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		const getById = vi.fn().mockRejectedValue(new Error("connection refused"));
		const app = createApp(noRegistration, { getAll, getById });

		const response = await request(app).get("/api/products/calluminator");

		expect(response.status).toBe(500);
		expect(response.body).toEqual({ error: "Internal server error" });
	});
});
