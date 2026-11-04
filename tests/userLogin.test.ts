import { PrismaPg } from "@prisma/adapter-pg";
import * as argon2 from "argon2";
import { jwtVerify } from "jose";
import request from "supertest";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app";
import { InvalidCredentialsError } from "../src/errors/invalidCredentialsError";
import { PrismaClient, type User } from "../src/generated/prisma/client";
import { PrismaLoginRepository } from "../src/userLogin/loginRepository";
import { LoginService } from "../src/userLogin/loginService";
import { UserService } from "../src/userRegistration/userService";
import { emptyProfileFields, noCart } from "./helpers";

const jwtSecret = "test-only-secret-not-for-production-123456789";
const password = "LongEnoughPassword123!";
const user: User = {
	id: 1,
	email: "customer@example.com",
	name: "Customer",
	passwordHash: "",
	...emptyProfileFields,
	safeWordHint: null,
	safeWordHash: null,
	createdAt: new Date("2026-01-01T00:00:00.000Z"),
};
const noRegistration = { register: vi.fn() };
const noProducts = {
	getAll: async () => [],
	getById: async () => null,
	delete: vi.fn(),
};

beforeAll(async () => {
	user.passwordHash = await argon2.hash(password, { type: argon2.argon2id });
});

function createLoginApp(findByEmail = vi.fn().mockResolvedValue(user)) {
	return createApp(
		noRegistration,
		noProducts,
		new LoginService({ findByEmail }, jwtSecret),
		noCart,
		jwtSecret,
	);
}

describe("POST /api/login", () => {
	it("issues an admin role claim for admin users", async () => {
		const findByEmail = vi
			.fn()
			.mockResolvedValue({ ...user, admin: { id: 1, userId: user.id } });
		const response = await request(createLoginApp(findByEmail))
			.post("/api/login")
			.send({ email: user.email, password });
		const { payload } = await jwtVerify(
			response.body.accessToken,
			new TextEncoder().encode(jwtSecret),
		);
		expect(payload.role).toBe("admin");
	});

	it("normalizes email and returns a verifiable, expiring JWT and safe user details", async () => {
		const findByEmail = vi.fn().mockResolvedValue(user);
		const response = await request(createLoginApp(findByEmail))
			.post("/api/login")
			.send({ email: " CUSTOMER@example.com ", password });

		expect(response.status).toBe(200);
		expect(response.headers["cache-control"]).toBe("no-store");
		expect(findByEmail).toHaveBeenCalledWith(user.email);
		expect(response.body).toEqual({
			accessToken: expect.any(String),
			tokenType: "Bearer",
			expiresIn: 3600,
			user: {
				email: user.email,
				name: user.name,
				createdAt: user.createdAt.toISOString(),
			},
		});

		const { payload, protectedHeader } = await jwtVerify(
			response.body.accessToken,
			new TextEncoder().encode(jwtSecret),
			{
				algorithms: ["HS256"],
				issuer: "the-achievers-backend",
				audience: "the-achievers-api",
			},
		);
		expect(protectedHeader).toEqual({ alg: "HS256", typ: "JWT" });
		expect(payload).toEqual({
			sub: String(user.id),
			role: "user",
			iss: "the-achievers-backend",
			aud: "the-achievers-api",
			iat: expect.any(Number),
			exp: expect.any(Number),
		});
		expect((payload.exp ?? 0) - (payload.iat ?? 0)).toBe(3600);
		await expect(
			jwtVerify(
				response.body.accessToken,
				new TextEncoder().encode(jwtSecret),
				{
					currentDate: new Date(((payload.exp ?? 0) + 1) * 1000),
				},
			),
		).rejects.toThrow();
		await expect(
			jwtVerify(
				response.body.accessToken,
				new TextEncoder().encode("different-test-only-secret-123456789"),
			),
		).rejects.toThrow();
	});

	it.each(["unknown email", "incorrect password"])(
		"returns the same 401 error for %s",
		async (failure) => {
			const findByEmail = vi
				.fn()
				.mockResolvedValue(failure === "unknown email" ? null : user);
			const response = await request(createLoginApp(findByEmail))
				.post("/api/login")
				.send({ email: user.email, password: "incorrect" });

			expect(response.status).toBe(401);
			expect(response.body).toEqual({ error: "Invalid email or password" });
		},
	);

	it("does not trim passwords", async () => {
		const response = await request(createLoginApp())
			.post("/api/login")
			.send({ email: user.email, password: ` ${password} ` });
		expect(response.status).toBe(401);
	});

	it.each([
		null,
		[],
		{},
		{ email: 123, password },
		{ email: "invalid-email", password },
		{ email: `${"a".repeat(250)}@example.com`, password },
		{ email: user.email },
		{ email: user.email, password: 123 },
		{ email: user.email, password: "" },
		{ email: user.email, password: "a".repeat(129) },
	])("rejects invalid input %j without calling the service", async (body) => {
		const login = vi.fn();
		const app = createApp(
			noRegistration,
			noProducts,
			{ login },
			noCart,
			jwtSecret,
		);
		const response = await request(app)
			.post("/api/login")
			.set("Content-Type", "application/json")
			.send(JSON.stringify(body));

		expect(response.status).toBe(400);
		expect(login).not.toHaveBeenCalled();
	});

	it("rejects malformed JSON", async () => {
		const response = await request(createLoginApp())
			.post("/api/login")
			.set("Content-Type", "application/json")
			.send("{ invalid");
		expect(response.status).toBe(400);
	});

	it("rejects oversized requests", async () => {
		const response = await request(createLoginApp())
			.post("/api/login")
			.send({ email: user.email, password: "a".repeat(11000) });
		expect(response.status).toBe(413);
	});

	it("logs database errors and returns a generic 500", async () => {
		const error = new Error("private database details");
		const log = vi.spyOn(console, "error").mockImplementation(() => {});
		try {
			const response = await request(
				createLoginApp(vi.fn().mockRejectedValue(error)),
			)
				.post("/api/login")
				.send({ email: user.email, password });

			expect(response.status).toBe(500);
			expect(response.body).toEqual({ error: "Internal server error" });
			expect(log).toHaveBeenCalledWith("Unhandled request error", error);
		} finally {
			log.mockRestore();
		}
	});

	it("accepts credentials created by the registration service", async () => {
		let registeredUser: User | null = null;
		const registration = new UserService({
			create: async (data) => {
				registeredUser = { ...user, ...data };
				return registeredUser;
			},
		});
		await registration.register({
			name: user.name,
			email: user.email,
			password,
			safeWordHint: "first-pet",
			safeWord: "Fluffy",
		});
		const login = new LoginService(
			{ findByEmail: async () => registeredUser },
			jwtSecret,
		);

		await expect(login.login({ email: user.email, password })).resolves.toEqual(
			{
				accessToken: expect.any(String),
				tokenType: "Bearer",
				expiresIn: 3600,
				user: {
					email: user.email,
					name: user.name,
					createdAt: user.createdAt,
				},
			},
		);
	});
});

describe("LoginService", () => {
	it.each(["", "too-short"])("rejects an insecure JWT secret", (secret) => {
		expect(() => new LoginService({ findByEmail: vi.fn() }, secret)).toThrow(
			"JWT_SECRET must contain at least 32 bytes",
		);
	});

	it("rejects an unknown email", async () => {
		const service = new LoginService(
			{ findByEmail: async () => null },
			jwtSecret,
		);
		await expect(
			service.login({ email: user.email, password }),
		).rejects.toBeInstanceOf(InvalidCredentialsError);
	});
});

describe("PrismaLoginRepository", () => {
	it("looks up the user by their unique email", async () => {
		const prisma = new PrismaClient({
			adapter: new PrismaPg({
				connectionString: "postgresql://test:test@localhost:5432/test",
			}),
		});
		const findUnique = vi
			.spyOn(prisma.user, "findUnique")
			.mockResolvedValue(user);
		const repository = new PrismaLoginRepository(prisma);
		await expect(repository.findByEmail(user.email)).resolves.toEqual(user);
		expect(findUnique).toHaveBeenCalledWith({
			where: { email: user.email },
			include: { admin: true },
		});
	});
});
