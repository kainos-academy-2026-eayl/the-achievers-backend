import express from "express";
import { SignJWT } from "jose";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createRequireAdmin } from "../src/auth/requireAdmin";

const secret = "test-only-secret-not-for-production-123456789";
const key = new TextEncoder().encode(secret);

function token(role: string, expiresIn = "1h") {
	return new SignJWT({ role })
		.setProtectedHeader({ alg: "HS256", typ: "JWT" })
		.setSubject("1")
		.setIssuer("the-achievers-backend")
		.setAudience("the-achievers-api")
		.setIssuedAt()
		.setExpirationTime(expiresIn)
		.sign(key);
}

const app = express();
app.get("/admin", createRequireAdmin(secret), (_req, res) => {
	res.json({ ok: true });
});

describe("requireAdmin", () => {
	it("allows admin tokens", async () => {
		const res = await request(app)
			.get("/admin")
			.set("Authorization", `Bearer ${await token("admin")}`);
		expect(res.status).toBe(200);
	});

	it("rejects non-admin tokens with 403", async () => {
		const res = await request(app)
			.get("/admin")
			.set("Authorization", `Bearer ${await token("user")}`);
		expect(res.status).toBe(403);
	});

	it("rejects missing, malformed and expired tokens with 401", async () => {
		expect((await request(app).get("/admin")).status).toBe(401);
		expect(
			(await request(app).get("/admin").set("Authorization", "Bearer junk"))
				.status,
		).toBe(401);
		const expired = await token("admin", "-10s");
		expect(
			(
				await request(app)
					.get("/admin")
					.set("Authorization", `Bearer ${expired}`)
			).status,
		).toBe(401);
	});
});
