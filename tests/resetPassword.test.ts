import * as argon2 from "argon2";
import request from "supertest";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app";
import type { ResetPassRepository } from "../src/resetPass/resetPassRepository";
import { ResetPassService } from "../src/resetPass/resetPassService";
import type { LoginRepository } from "../src/userLogin/loginRepository";
import { LoginService } from "../src/userLogin/loginService";
import { noCart, testJwtSecret } from "./helpers";

const email = "customer@example.com";
const safeWord = "Biscuit";
const oldPassword = "old-password-123";
const newPassword = "brand-new-password-456";
const unauthorized = { error: "Invalid email or safe word" };

interface StoredUser {
	id: number;
	email: string;
	name: string;
	passwordHash: string;
	safeWordHash: string | null;
	admin: null;
}

let store: Map<string, StoredUser>;

function createStores() {
	const resetRepository: ResetPassRepository = {
		findSafeWordHashByEmail: vi.fn(async (e: string) => {
			const user = store.get(e);
			return user ? { safeWordHash: user.safeWordHash } : null;
		}),
		updatePasswordHash: vi.fn(async (e: string, passwordHash: string) => {
			const user = store.get(e);
			if (user) user.passwordHash = passwordHash;
		}),
	};
	const loginRepository = {
		findByEmail: async (e: string) => store.get(e) ?? null,
	} as unknown as LoginRepository;
	return { resetRepository, loginRepository };
}

function createResetApp() {
	const { resetRepository, loginRepository } = createStores();
	const app = createApp(
		{ register: vi.fn() },
		{ getAll: async () => [], getById: async () => null, delete: vi.fn() },
		new LoginService(loginRepository, testJwtSecret),
		noCart,
		testJwtSecret,
		undefined,
		undefined,
		undefined,
		undefined,
		undefined,
		new ResetPassService(resetRepository),
	);
	return { app, resetRepository };
}

beforeAll(async () => {
	store = new Map();
});

async function seed(safeWordHash: string | null | "hash") {
	store = new Map([
		[
			email,
			{
				id: 1,
				email,
				name: "Customer",
				passwordHash: await argon2.hash(oldPassword, { type: argon2.argon2id }),
				safeWordHash:
					safeWordHash === "hash"
						? await argon2.hash(safeWord, { type: argon2.argon2id })
						: safeWordHash,
				admin: null,
			},
		],
	]);
}

describe("POST /api/reset-password/verify", () => {
	it("returns 204 with no body for the right safe word", async () => {
		await seed("hash");
		const response = await request(createResetApp().app)
			.post("/api/reset-password/verify")
			.send({ email: ` ${email.toUpperCase()} `, safeWord });

		expect(response.status).toBe(204);
		expect(response.headers["cache-control"]).toBe("no-store");
		expect(response.text).toBe("");
	});

	it("returns an identical 401 for wrong word, unknown email and no safe word", async () => {
		await seed("hash");
		const app = createResetApp().app;
		const wrong = await request(app)
			.post("/api/reset-password/verify")
			.send({ email, safeWord: "nope" });
		const unknown = await request(app)
			.post("/api/reset-password/verify")
			.send({ email: "other@example.com", safeWord });

		await seed(null);
		const none = await request(createResetApp().app)
			.post("/api/reset-password/verify")
			.send({ email, safeWord });

		for (const response of [wrong, unknown, none]) {
			expect(response.status).toBe(401);
			expect(response.headers["cache-control"]).toBe("no-store");
			expect(response.body).toEqual(unauthorized);
		}
	});

	it.each([
		["missing email", { safeWord }],
		["invalid email", { email: "nope", safeWord }],
		["missing safe word", { email }],
		["blank safe word", { email, safeWord: "   " }],
		["too long safe word", { email, safeWord: "a".repeat(129) }],
		["non-string safe word", { email, safeWord: 5 }],
	])("returns 400 for %s without querying", async (_case, body) => {
		const { app, resetRepository } = createResetApp();
		const response = await request(app)
			.post("/api/reset-password/verify")
			.send(body);

		expect(response.status).toBe(400);
		expect(response.headers["cache-control"]).toBe("no-store");
		expect(resetRepository.findSafeWordHashByEmail).not.toHaveBeenCalled();
	});

	it("never leaks hashes or the safe word", async () => {
		await seed("hash");
		const response = await request(createResetApp().app)
			.post("/api/reset-password/verify")
			.send({ email, safeWord: "wrong" });

		expect(response.text).not.toContain("argon2");
		expect(response.text).not.toContain(safeWord);
	});

	it("rate-limits to 5 attempts per email, not per IP", async () => {
		await seed("hash");
		const { app } = createResetApp();
		for (let attempt = 0; attempt < 5; attempt++) {
			const response = await request(app)
				.post("/api/reset-password/verify")
				.send({ email, safeWord: "wrong" });
			expect(response.status).toBe(401);
		}

		const limited = await request(app)
			.post("/api/reset-password/verify")
			.send({ email, safeWord });
		expect(limited.status).toBe(429);
		expect(limited.headers["cache-control"]).toBe("no-store");
		expect(limited.headers["retry-after"]).toBe("900");

		const otherEmail = await request(app)
			.post("/api/reset-password/verify")
			.send({ email: "other@example.com", safeWord });
		expect(otherEmail.status).toBe(401);
	});
});

describe("POST /api/reset-password", () => {
	it("changes the password: old stops working, new logs in", async () => {
		await seed("hash");
		const { app, resetRepository } = createResetApp();
		const response = await request(app)
			.post("/api/reset-password")
			.send({ email, safeWord, newPassword });

		expect(response.status).toBe(204);
		expect(response.text).toBe("");
		expect(response.headers["cache-control"]).toBe("no-store");
		expect(resetRepository.updatePasswordHash).toHaveBeenCalledTimes(1);

		const oldLogin = await request(app)
			.post("/api/login")
			.send({ email, password: oldPassword });
		expect(oldLogin.status).toBe(401);
		const newLogin = await request(app)
			.post("/api/login")
			.send({ email, password: newPassword });
		expect(newLogin.status).toBe(200);
	});

	it("does not change the password for a wrong safe word or unknown email", async () => {
		await seed("hash");
		const { app, resetRepository } = createResetApp();
		const wrong = await request(app)
			.post("/api/reset-password")
			.send({ email, safeWord: "nope", newPassword });
		const unknown = await request(app)
			.post("/api/reset-password")
			.send({ email: "other@example.com", safeWord, newPassword });

		for (const response of [wrong, unknown]) {
			expect(response.status).toBe(401);
			expect(response.body).toEqual(unauthorized);
			expect(response.text).not.toContain(newPassword);
		}
		expect(resetRepository.updatePasswordHash).not.toHaveBeenCalled();
	});

	it.each([
		["short", "short"],
		["too long", "a".repeat(129)],
		["missing", undefined],
	])("returns 400 for a %s new password", async (_case, password) => {
		await seed("hash");
		const { app, resetRepository } = createResetApp();
		const response = await request(app)
			.post("/api/reset-password")
			.send({ email, safeWord, newPassword: password });

		expect(response.status).toBe(400);
		expect(resetRepository.findSafeWordHashByEmail).not.toHaveBeenCalled();
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
			.post("/api/reset-password")
			.send({ email, safeWord, newPassword });
		expect(response.status).toBe(404);
	});
});
