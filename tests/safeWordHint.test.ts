import { PrismaPg } from "@prisma/adapter-pg";
import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app";
import { PrismaClient, type User } from "../src/generated/prisma/client";
import { createRateLimiter } from "../src/rateLimit";
import { PrismaSafeWordHintRepository } from "../src/safeWordHint/safeWordHintRepository";
import { SafeWordHintService } from "../src/safeWordHint/safeWordHintService";
import { emptyProfileFields, noCart, testJwtSecret } from "./helpers";

const user: User = {
	id: 1,
	email: "customer@example.com",
	name: "Customer",
	passwordHash: "$argon2id$password-hash",
	...emptyProfileFields,
	safeWordHint: "first-pet",
	safeWordHash: "$argon2id$safe-word-hash",
	createdAt: new Date("2026-01-01T00:00:00.000Z"),
};
const notFoundBody = { error: "No safe-word hint found for that email" };

function createHintApp(
	findSafeWordHintByEmail = vi.fn().mockResolvedValue(user),
) {
	return createApp(
		{ register: vi.fn() },
		{ getAll: async () => [], getById: async () => null, delete: vi.fn() },
		{ login: vi.fn() },
		noCart,
		testJwtSecret,
		undefined,
		undefined,
		undefined,
		undefined,
		new SafeWordHintService({ findSafeWordHintByEmail }),
	);
}

describe("GET /api/safe-word-hint", () => {
	it("returns the stored hint identifier for a normalized email", async () => {
		const findSafeWordHintByEmail = vi.fn().mockResolvedValue(user);
		const response = await request(createHintApp(findSafeWordHintByEmail))
			.get("/api/safe-word-hint")
			.query({ email: " CUSTOMER@example.com " });

		expect(response.status).toBe(200);
		expect(response.headers["cache-control"]).toBe("no-store");
		expect(response.body).toEqual({ safeWordHint: "first-pet" });
		expect(findSafeWordHintByEmail).toHaveBeenCalledWith(user.email);
	});

	it("never returns hashes or other user fields", async () => {
		const response = await request(createHintApp())
			.get("/api/safe-word-hint")
			.query({ email: user.email });

		expect(Object.keys(response.body)).toEqual(["safeWordHint"]);
		expect(response.text).not.toContain("safeWordHash");
		expect(response.text).not.toContain("passwordHash");
		expect(response.text).not.toContain(user.safeWordHash);
		expect(response.text).not.toContain(user.passwordHash);
	});

	it.each([
		["an unknown email", null],
		["a user with a null hint", { safeWordHint: null }],
		["a user with an unrecognized hint", { safeWordHint: "secret-question" }],
	])("returns the same 404 for %s", async (_case, stored) => {
		const response = await request(
			createHintApp(vi.fn().mockResolvedValue(stored)),
		)
			.get("/api/safe-word-hint")
			.query({ email: user.email });

		expect(response.status).toBe(404);
		expect(response.headers["cache-control"]).toBe("no-store");
		expect(response.body).toEqual(notFoundBody);
	});

	it.each([
		["missing", ""],
		["empty", "?email="],
		["blank", "?email=%20%20"],
		["invalid", "?email=invalid-email"],
		["too long", `?email=${"a".repeat(250)}%40example.com`],
		["repeated", "?email=a%40example.com&email=b%40example.com"],
	])("returns 400 for a %s email without querying", async (_case, query) => {
		const findSafeWordHintByEmail = vi.fn();
		const response = await request(createHintApp(findSafeWordHintByEmail)).get(
			`/api/safe-word-hint${query}`,
		);

		expect(response.status).toBe(400);
		expect(response.headers["cache-control"]).toBe("no-store");
		expect(response.body).toEqual({ error: "A valid email is required" });
		expect(findSafeWordHintByEmail).not.toHaveBeenCalled();
	});

	it("logs database errors and returns a generic 500", async () => {
		const error = new Error("private database details");
		const log = vi.spyOn(console, "error").mockImplementation(() => {});
		try {
			const response = await request(
				createHintApp(vi.fn().mockRejectedValue(error)),
			)
				.get("/api/safe-word-hint")
				.query({ email: user.email });

			expect(response.status).toBe(500);
			expect(response.body).toEqual({ error: "Internal server error" });
			expect(log).toHaveBeenCalledWith("Unhandled request error", error);
		} finally {
			log.mockRestore();
		}
	});

	it("rate-limits to 5 requests per minute", async () => {
		const findSafeWordHintByEmail = vi.fn().mockResolvedValue(user);
		const app = createHintApp(findSafeWordHintByEmail);
		for (let attempt = 0; attempt < 5; attempt++) {
			const response = await request(app)
				.get("/api/safe-word-hint")
				.query({ email: user.email });
			expect(response.status).toBe(200);
		}

		const limited = await request(app)
			.get("/api/safe-word-hint")
			.query({ email: user.email });
		expect(limited.status).toBe(429);
		expect(limited.headers["cache-control"]).toBe("no-store");
		expect(limited.headers["retry-after"]).toBe("60");
		expect(limited.body).toEqual({
			error: "Too many requests, try again later",
		});
		expect(findSafeWordHintByEmail).toHaveBeenCalledTimes(5);
	});

	it("is not mounted when no service is provided", async () => {
		const app = createApp(
			{ register: vi.fn() },
			{ getAll: async () => [], getById: async () => null, delete: vi.fn() },
			{ login: vi.fn() },
			noCart,
			testJwtSecret,
		);
		const response = await request(app)
			.get("/api/safe-word-hint")
			.query({ email: user.email });
		expect(response.status).toBe(404);
	});
});

describe("createRateLimiter", () => {
	it("allows requests again once the window has passed", async () => {
		let now = 0;
		const app = express();
		app.use(createRateLimiter({ limit: 1, windowMs: 1000, now: () => now }));
		app.get("/", (_req, res) => {
			res.sendStatus(204);
		});

		expect((await request(app).get("/")).status).toBe(204);
		expect((await request(app).get("/")).status).toBe(429);
		now = 1000;
		expect((await request(app).get("/")).status).toBe(204);
	});
});

describe("PrismaSafeWordHintRepository", () => {
	it("selects only the safe-word hint by unique email", async () => {
		const prisma = new PrismaClient({
			adapter: new PrismaPg({
				connectionString: "postgresql://user:password@localhost:5432/test",
			}),
		});
		const findUnique = vi
			.spyOn(prisma.user, "findUnique")
			.mockResolvedValue({ safeWordHint: "holiday" } as User);
		const repository = new PrismaSafeWordHintRepository(prisma);

		await expect(
			repository.findSafeWordHintByEmail(user.email),
		).resolves.toEqual({ safeWordHint: "holiday" });
		expect(findUnique).toHaveBeenCalledWith({
			where: { email: user.email },
			select: { safeWordHint: true },
		});
	});
});
