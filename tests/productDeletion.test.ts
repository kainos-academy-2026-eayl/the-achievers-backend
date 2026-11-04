import { PrismaPg } from "@prisma/adapter-pg";
import { SignJWT } from "jose";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaProductRepository } from "../src/products/productRepository";
import { ProductService } from "../src/products/productService";
import { noCart, testJwtSecret } from "./helpers";

async function token(role = "admin", expiresIn = "1h", secret = testJwtSecret) {
	return new SignJWT({ role })
		.setProtectedHeader({ alg: "HS256" })
		.setSubject("1")
		.setIssuer("the-achievers-backend")
		.setAudience("the-achievers-api")
		.setExpirationTime(expiresIn)
		.sign(new TextEncoder().encode(secret));
}

function setup() {
	const prisma = new PrismaClient({
		adapter: new PrismaPg({ connectionString: "postgresql://localhost/test" }),
	});
	const deleteMany = vi.spyOn(prisma.product, "deleteMany");
	const service = new ProductService(new PrismaProductRepository(prisma));
	const app = createApp(
		{ register: vi.fn() },
		service,
		{ login: vi.fn() },
		noCart,
		testJwtSecret,
	);
	return { app, deleteMany };
}

afterEach(() => vi.restoreAllMocks());

describe("DELETE /api/products/:id", () => {
	it("deletes only the requested product and returns an empty 204", async () => {
		const { app, deleteMany } = setup();
		deleteMany.mockResolvedValue({ count: 1 });
		const response = await request(app)
			.delete("/api/products/cue-1")
			.set("Authorization", `Bearer ${await token()}`);
		expect(response.status).toBe(204);
		expect(response.text).toBe("");
		expect(deleteMany).toHaveBeenCalledExactlyOnceWith({
			where: { id: "cue-1" },
		});
	});

	it("returns 404 for a missing product, including a repeated deletion", async () => {
		const { app, deleteMany } = setup();
		deleteMany
			.mockResolvedValueOnce({ count: 1 })
			.mockResolvedValue({ count: 0 });
		const authorization = `Bearer ${await token()}`;
		await request(app)
			.delete("/api/products/cue-1")
			.set("Authorization", authorization)
			.expect(204);
		const response = await request(app)
			.delete("/api/products/cue-1")
			.set("Authorization", authorization)
			.expect(404);
		expect(response.body).toEqual({ error: "Product not found" });
	});

	it("rejects missing, invalid, expired and incorrectly signed credentials before deletion", async () => {
		const { app, deleteMany } = setup();
		const headers = [
			undefined,
			"Bearer invalid",
			`Bearer ${await token("admin", "-10s")}`,
			`Bearer ${await token("admin", "1h", "different-signing-secret")}`,
		];
		for (const authorization of headers) {
			const req = request(app).delete("/api/products/cue-1");
			if (authorization) req.set("Authorization", authorization);
			await req.expect(401);
		}
		expect(deleteMany).not.toHaveBeenCalled();
	});

	it("rejects authenticated non-admins before deletion", async () => {
		const { app, deleteMany } = setup();
		await request(app)
			.delete("/api/products/cue-1")
			.set("Authorization", `Bearer ${await token("user")}`)
			.expect(403);
		expect(deleteMany).not.toHaveBeenCalled();
	});

	it("logs unexpected failures without exposing database details", async () => {
		const { app, deleteMany } = setup();
		const error = new Error("private database failure");
		deleteMany.mockRejectedValue(error);
		const logger = vi.spyOn(console, "error").mockImplementation(() => {});
		const response = await request(app)
			.delete("/api/products/cue-1")
			.set("Authorization", `Bearer ${await token()}`)
			.expect(500);
		expect(response.body).toEqual({ error: "Internal server error" });
		expect(logger).toHaveBeenCalledWith("Unhandled request error", error);
	});

	it("allows an Authorization header in the configured frontend preflight", async () => {
		const { app } = setup();
		const response = await request(app)
			.options("/api/products/cue-1")
			.set("Origin", "http://localhost:8000")
			.set("Access-Control-Request-Method", "DELETE")
			.set("Access-Control-Request-Headers", "authorization")
			.expect(204);
		expect(response.headers["access-control-allow-headers"]).toContain(
			"Authorization",
		);
	});
});
