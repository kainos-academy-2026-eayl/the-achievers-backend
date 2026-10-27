import * as argon2 from "argon2";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app";
import { EmailAlreadyRegisteredError } from "../src/errors/emailAlreadyRegisteredError";
import type { UserRepository } from "../src/userRegistration/userRepository";
import { UserService } from "../src/userRegistration/userService";
import { emptyProfileFields, noCart } from "./helpers";

const password = "LongEnoughPassword123!";
const noProducts = { getAll: async () => [], getById: async () => null };
const noLogin = { login: vi.fn() };
const user = {
	id: 1,
	email: "customer@example.com",
	name: "Customer",
	passwordHash: "argon2-hash",
	...emptyProfileFields,
	createdAt: new Date("2026-01-01T00:00:00.000Z"),
};

describe("user registration endpoints", () => {
	it("registers a user and does not return the password hash", async () => {
		const register = vi.fn().mockResolvedValue(user);
		const app = createApp({ register }, noProducts, noLogin, noCart);

		const response = await request(app).post("/api/register").send({
			name: " Customer ",
			email: " CUSTOMER@example.com ",
			password,
		});

		expect(response.status).toBe(201);
		expect(response.body).toEqual({
			email: user.email,
			name: user.name,
			createdAt: user.createdAt.toISOString(),
		});
		expect(response.body).not.toHaveProperty("passwordHash");
		expect(response.body).not.toHaveProperty("id");
		expect(register).toHaveBeenCalledWith({
			name: user.name,
			email: user.email,
			password,
		});
	});

	it("does not expose the old registration routes", async () => {
		const register = vi.fn().mockResolvedValue(user);
		const app = createApp({ register }, noProducts, noLogin, noCart);

		const responses = await Promise.all([
			request(app).post("/api/auth/register"),
			request(app).post("/api-register"),
		]);

		expect(responses.map((response) => response.status)).toEqual([404, 404]);
		expect(register).not.toHaveBeenCalled();
	});

	it("rejects invalid registration data", async () => {
		const register = vi.fn();
		const app = createApp({ register }, noProducts, noLogin, noCart);

		const response = await request(app).post("/api/register").send({
			name: "Customer",
			email: "not-an-email",
			password: "short",
		});

		expect(response.status).toBe(400);
		expect(register).not.toHaveBeenCalled();
	});

	it("returns a client error for malformed JSON", async () => {
		const app = createApp({ register: vi.fn() }, noProducts, noLogin, noCart);

		const response = await request(app)
			.post("/api/register")
			.set("Content-Type", "application/json")
			.send("{ invalid");

		expect(response.status).toBe(400);
		expect(response.body.error).toBe("Invalid request");
	});

	it("returns a conflict when the email is already registered", async () => {
		const register = vi
			.fn()
			.mockRejectedValue(new EmailAlreadyRegisteredError());
		const app = createApp({ register }, noProducts, noLogin, noCart);

		const response = await request(app).post("/api/register").send({
			name: user.name,
			email: user.email,
			password,
		});

		expect(response.status).toBe(409);
		expect(response.body.error).toBe(
			"An account with this email already exists",
		);
	});
});

describe("UserService", () => {
	it("stores an Argon2id hash instead of the submitted password", async () => {
		let persistedUser: Parameters<UserRepository["create"]>[0] | undefined;
		const repository: UserRepository = {
			create: async (data) => {
				persistedUser = data;
				return { ...user, ...data };
			},
		};
		const service = new UserService(repository);

		await service.register({
			name: user.name,
			email: user.email,
			password,
		});

		expect(persistedUser).toBeDefined();
		expect(persistedUser?.passwordHash).not.toBe(password);
		expect(persistedUser?.passwordHash.startsWith("$argon2id$")).toBe(true);
		expect(
			await argon2.verify(persistedUser?.passwordHash ?? "", password),
		).toBe(true);
	});
});
