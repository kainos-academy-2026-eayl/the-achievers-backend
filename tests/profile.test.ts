import { randomUUID } from "node:crypto";
import { SignJWT } from "jose";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { PrismaCartRepository } from "../src/cart/cartRepository";
import { CartService } from "../src/cart/cartService";
import { SAFE_WORD_HINTS } from "../src/dtos/registerUserDto";
import { createPrismaClient } from "../src/prismaClient";
import { PrismaProductRepository } from "../src/products/productRepository";
import { ProductService } from "../src/products/productService";
import { PrismaProfileRepository } from "../src/profile/profileRepository";
import { ProfileService } from "../src/profile/profileService";
import { PrismaLoginRepository } from "../src/userLogin/loginRepository";
import { LoginService } from "../src/userLogin/loginService";
import { PrismaUserRepository } from "../src/userRegistration/userRepository";
import { UserService } from "../src/userRegistration/userService";

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
	throw new Error("JWT_SECRET must be set to run the profile tests");
}

const prisma = createPrismaClient();
const productRepository = new PrismaProductRepository(prisma);
const app = createApp(
	new UserService(new PrismaUserRepository(prisma)),
	new ProductService(productRepository),
	new LoginService(new PrismaLoginRepository(prisma), jwtSecret),
	new CartService(new PrismaCartRepository(prisma), productRepository),
	undefined,
	{
		service: new ProfileService(new PrismaProfileRepository(prisma)),
		jwtSecret,
	},
);

const createdEmails: string[] = [];

type Customer = {
	id: number;
	name: string;
	email: string;
	password: string;
	token: string;
	auth: string;
};

async function createCustomer(): Promise<Customer> {
	const id = randomUUID();
	const name = `Profile Test ${id.slice(0, 8)}`;
	const email = `profile-test-${id}@example.com`;
	const password = `Pw-${randomUUID()}`;
	createdEmails.push(email);

	await request(app)
		.post("/api/register")
		.send({
			name,
			email,
			password,
			safeWordHint: SAFE_WORD_HINTS[0],
			safeWord: randomUUID(),
		})
		.expect(201);
	const login = await request(app)
		.post("/api/login")
		.send({ email, password })
		.expect(200);
	const user = await prisma.user.findUniqueOrThrow({ where: { email } });
	const token: string = login.body.accessToken;
	return { id: user.id, name, email, password, token, auth: `Bearer ${token}` };
}

function signToken(
	sub: string,
	options: {
		secret?: string;
		issuer?: string;
		expired?: boolean;
		withoutExpiration?: boolean;
	} = {},
) {
	const now = Math.floor(Date.now() / 1000);
	const token = new SignJWT({})
		.setProtectedHeader({ alg: "HS256", typ: "JWT" })
		.setSubject(sub)
		.setIssuer(options.issuer ?? "the-achievers-backend")
		.setAudience("the-achievers-api")
		.setIssuedAt(now - 7200);
	if (!options.withoutExpiration) {
		token.setExpirationTime(options.expired ? now - 3600 : now + 3600);
	}
	return token.sign(
		new TextEncoder().encode(options.secret ?? (jwtSecret as string)),
	);
}

function homeAddress() {
	return {
		addressLine1: `${Math.floor(Math.random() * 900) + 1} Cue Street`,
		addressLine2: "",
		city: "Belfast",
		postcode: "bt1 1aa",
	};
}

function otherAddress(label: string) {
	return {
		label,
		addressLine1: `${Math.floor(Math.random() * 900) + 1} ${label} Road`,
		city: "Lisburn",
		postcode: "BT27 4AA",
	};
}

function validUpdate(customer: Customer) {
	return {
		name: `  ${customer.name} Updated  `,
		email: customer.email,
		phone: "07123 456 789",
		homeAddress: homeAddress(),
		otherAddresses: [],
		currentPassword: customer.password,
	};
}

function patchProfile(customer: Customer, body: object) {
	return request(app)
		.patch("/api/me")
		.set("Authorization", customer.auth)
		.send(body);
}

function storedAddresses(userId: number) {
	return prisma.userAddresses.findMany({
		where: { userId },
		orderBy: { addressId: "asc" },
	});
}

let customer: Customer;
let otherCustomer: Customer;

beforeAll(async () => {
	customer = await createCustomer();
	otherCustomer = await createCustomer();
}, 30_000);

afterAll(async () => {
	await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
	await prisma.$disconnect();
});

describe("CORS", () => {
	it("allows Authorization in the profile preflight response", async () => {
		const response = await request(app)
			.options("/api/me")
			.set("Origin", "http://localhost:8000")
			.set("Access-Control-Request-Method", "PATCH")
			.set("Access-Control-Request-Headers", "authorization");

		expect(response.status).toBe(204);
		expect(response.headers["access-control-allow-headers"]).toContain(
			"Authorization",
		);
	});
});

describe("GET /api/me", () => {
	it("returns the logged-in customer's stored profile without sensitive fields", async () => {
		const fresh = await createCustomer();
		const stored = await prisma.user.findUniqueOrThrow({
			where: { id: fresh.id },
		});

		const response = await request(app)
			.get("/api/me")
			.set("Authorization", fresh.auth);

		expect(response.status).toBe(200);
		expect(response.headers["cache-control"]).toBe("no-store");
		expect(response.body).toEqual({
			email: fresh.email,
			name: fresh.name,
			phone: null,
			creditBalance: 100_000,
			homeAddress: null,
			otherAddresses: [],
			createdAt: stored.createdAt.toISOString(),
		});
	});

	it("only ever returns the profile belonging to the token", async () => {
		const response = await request(app)
			.get(`/api/me?id=${customer.id}`)
			.set("Authorization", otherCustomer.auth);

		expect(response.body.email).toBe(otherCustomer.email);
	});

	it.each([
		["no header", undefined],
		["wrong scheme", "Basic abc"],
		["garbage token", "Bearer not-a-jwt"],
	])("rejects requests with %s", async (_label, header) => {
		const req = request(app).get("/api/me");
		if (header) req.set("Authorization", header);
		const response = await req;

		expect(response.status).toBe(401);
		expect(response.body).toEqual({ error: "Authentication required" });
	});

	it.each([
		["expired", { expired: true }],
		["without expiration", { withoutExpiration: true }],
		["wrong secret", { secret: `wrong-${randomUUID()}-${randomUUID()}` }],
		["wrong issuer", { issuer: "someone-else" }],
	])("rejects %s tokens", async (_label, options) => {
		const token = await signToken(String(customer.id), options);
		const response = await request(app)
			.get("/api/me")
			.set("Authorization", `Bearer ${token}`);

		expect(response.status).toBe(401);
	});

	it("returns 404 when the user no longer exists", async () => {
		const deleted = await createCustomer();
		await prisma.user.delete({ where: { id: deleted.id } });

		const response = await request(app)
			.get("/api/me")
			.set("Authorization", deleted.auth);

		expect(response.status).toBe(404);
	});
});

describe("PATCH /api/me", () => {
	it("saves personal details to User and the home address to UserAddresses", async () => {
		const update = validUpdate(customer);
		const response = await patchProfile(customer, update);

		expect(response.status).toBe(200);
		const stored = await prisma.user.findUniqueOrThrow({
			where: { id: customer.id },
		});
		expect(stored).toMatchObject({
			name: update.name.trim(),
			phone: "07123456789",
		});
		const addresses = await storedAddresses(customer.id);
		expect(addresses).toEqual([
			expect.objectContaining({
				userId: customer.id,
				addressType: "home",
				label: null,
				addressLine1: update.homeAddress.addressLine1,
				addressLine2: null,
				city: "Belfast",
				postcode: "BT1 1AA",
			}),
		]);

		const reloaded = await request(app)
			.get("/api/me")
			.set("Authorization", customer.auth);
		expect(reloaded.body).toEqual(response.body);
		expect(reloaded.body.homeAddress.addressLine1).toBe(
			update.homeAddress.addressLine1,
		);

		const untouched = await prisma.user.findUniqueOrThrow({
			where: { id: otherCustomer.id },
		});
		expect(untouched.name).toBe(otherCustomer.name);
	});

	it("saves a home address and up to two named other addresses", async () => {
		const work = otherAddress("Work");
		const family = { ...otherAddress("Family"), addressLine2: "Flat 1" };
		const response = await patchProfile(customer, {
			...validUpdate(customer),
			otherAddresses: [work, family],
		});

		expect(response.status).toBe(200);
		expect(response.body.otherAddresses).toEqual([
			{ ...work, addressLine2: null },
			family,
		]);
		const addresses = await storedAddresses(customer.id);
		expect(addresses.map((row) => row.addressType)).toEqual([
			"home",
			"other",
			"other",
		]);
		expect(addresses.map((row) => row.label)).toEqual([null, "Work", "Family"]);
	});

	it("keeps address IDs when editing and deletes removed addresses", async () => {
		await patchProfile(customer, {
			...validUpdate(customer),
			otherAddresses: [otherAddress("Work"), otherAddress("Family")],
		}).expect(200);
		const before = await storedAddresses(customer.id);

		const renamed = otherAddress("Office");
		await patchProfile(customer, {
			...validUpdate(customer),
			otherAddresses: [renamed],
		}).expect(200);
		const after = await storedAddresses(customer.id);

		expect(after).toHaveLength(2);
		expect(after.map((row) => row.addressId)).toEqual(
			before.slice(0, 2).map((row) => row.addressId),
		);
		expect(after[1]).toMatchObject({
			label: "Office",
			addressLine1: renamed.addressLine1,
		});
		expect(
			await prisma.userAddresses.findUnique({
				where: { addressId: before[2]?.addressId ?? -1 },
			}),
		).toBeNull();
	});

	it("ignores empty other-address slots", async () => {
		const work = otherAddress("Work");
		const response = await patchProfile(customer, {
			...validUpdate(customer),
			otherAddresses: [
				{ label: "", addressLine1: "", city: "", postcode: "" },
				work,
			],
		});

		expect(response.status).toBe(200);
		expect(response.body.otherAddresses).toHaveLength(1);
		expect(await storedAddresses(customer.id)).toHaveLength(2);
	});

	it("allows phone and addresses to be cleared", async () => {
		await patchProfile(customer, validUpdate(customer)).expect(200);

		const response = await patchProfile(customer, {
			name: customer.name,
			email: customer.email,
			currentPassword: customer.password,
		});

		expect(response.status).toBe(200);
		expect(response.body).toMatchObject({
			phone: null,
			homeAddress: null,
			otherAddresses: [],
		});
		expect(await storedAddresses(customer.id)).toEqual([]);
	});

	it("rejects more than two other addresses and saves nothing", async () => {
		const before = await storedAddresses(customer.id);
		const response = await patchProfile(customer, {
			...validUpdate(customer),
			otherAddresses: ["A", "B", "C"].map(otherAddress),
		});

		expect(response.status).toBe(400);
		expect(response.body.fieldErrors).toEqual({
			otherAddresses: "You can save up to 2 other addresses",
		});
		expect(await storedAddresses(customer.id)).toEqual(before);
	});

	it("requires a home address before other addresses", async () => {
		const response = await patchProfile(customer, {
			...validUpdate(customer),
			homeAddress: null,
			otherAddresses: [otherAddress("Work")],
		});

		expect(response.status).toBe(400);
		expect(response.body.fieldErrors).toEqual({
			otherAddresses: "Add a home address before adding other addresses",
		});
	});

	it("validates each other address separately", async () => {
		const response = await patchProfile(customer, {
			...validUpdate(customer),
			otherAddresses: [
				otherAddress("Work"),
				{ ...otherAddress("x".repeat(41)), city: "" },
			],
		});

		expect(response.status).toBe(400);
		expect(response.body.fieldErrors).toEqual({
			"otherAddresses.1.label": "Address name must be 40 characters or fewer",
			"otherAddresses.1.city": "Enter your town or city",
		});
	});

	it.each(["0712345678", "+44712345678"])(
		"rejects incomplete UK mobile numbers: %s",
		async (phone) => {
			const response = await patchProfile(customer, {
				...validUpdate(customer),
				phone,
			});

			expect(response.status).toBe(400);
			expect(response.body.fieldErrors.phone).toBe(
				"Enter a valid UK phone number, for example 07123 456789",
			);
		},
	);

	it("accepts a shorter UK landline number", async () => {
		const response = await patchProfile(customer, {
			...validUpdate(customer),
			phone: "016977 1234",
		});

		expect(response.status).toBe(200);
		const stored = await prisma.user.findUniqueOrThrow({
			where: { id: customer.id },
		});
		expect(stored.phone).toBe("0169771234");
	});

	it.each(["ZZ99 9ZZ", "SW1A 1CI"])(
		"rejects invalid UK postcodes: %s",
		async (postcode) => {
			const response = await patchProfile(customer, {
				...validUpdate(customer),
				homeAddress: { ...homeAddress(), postcode },
			});

			expect(response.status).toBe(400);
			expect(response.body.fieldErrors["homeAddress.postcode"]).toBe(
				"Enter a valid UK postcode, for example SW1A 1AA",
			);
		},
	);

	it("accepts the GIR 0AA postcode exception", async () => {
		const response = await patchProfile(customer, {
			...validUpdate(customer),
			homeAddress: { ...homeAddress(), postcode: "gir 0aa" },
		});

		expect(response.status).toBe(200);
		const [home] = await storedAddresses(customer.id);
		expect(home?.postcode).toBe("GIR 0AA");
	});

	it("returns field errors for invalid data and changes nothing in the database", async () => {
		const before = await prisma.user.findUniqueOrThrow({
			where: { id: customer.id },
			include: { addresses: true },
		});
		const response = await patchProfile(customer, {
			name: " ",
			email: "not-an-email",
			phone: "12345",
			homeAddress: { addressLine1: "1 Cue Street", city: "", postcode: "NOPE" },
		});

		expect(response.status).toBe(400);
		expect(response.body).toEqual({
			error: "Validation failed",
			fieldErrors: {
				name: "Enter your name",
				email: "Enter a valid email address, for example name@example.com",
				phone: "Enter a valid UK phone number, for example 07123 456789",
				"homeAddress.city": "Enter your town or city",
				"homeAddress.postcode":
					"Enter a valid UK postcode, for example SW1A 1AA",
				currentPassword: "Enter your current password to save changes",
			},
		});
		const after = await prisma.user.findUniqueOrThrow({
			where: { id: customer.id },
			include: { addresses: true },
		});
		expect(after).toEqual(before);
	});

	it.each([null, [], "text"])("rejects a non-object body: %j", async (body) => {
		const response = await request(app)
			.patch("/api/me")
			.set("Authorization", customer.auth)
			.set("Content-Type", "application/json")
			.send(JSON.stringify(body));

		expect(response.status).toBe(400);
	});

	it("requires the correct current password for any change", async () => {
		const fresh = await createCustomer();
		const newEmail = `profile-test-${randomUUID()}@example.com`;
		createdEmails.push(newEmail);
		const { currentPassword: _, ...withoutPassword } = validUpdate(fresh);

		const missing = await patchProfile(fresh, withoutPassword);
		expect(missing.status).toBe(400);
		expect(missing.body.fieldErrors).toEqual({
			currentPassword: "Enter your current password to save changes",
		});

		const wrong = await patchProfile(fresh, {
			...withoutPassword,
			currentPassword: `wrong-${randomUUID()}`,
		});
		expect(wrong.status).toBe(400);
		expect(wrong.body.fieldErrors).toEqual({
			currentPassword: "Your current password is incorrect",
		});
		const unchanged = await prisma.user.findUniqueOrThrow({
			where: { id: fresh.id },
		});
		expect(unchanged.name).toBe(fresh.name);

		const correct = await patchProfile(fresh, {
			...validUpdate(fresh),
			email: newEmail,
		});
		expect(correct.status).toBe(200);
		const stored = await prisma.user.findUniqueOrThrow({
			where: { id: fresh.id },
		});
		expect(stored.email).toBe(newEmail);
	});

	it("rejects an email that belongs to another customer", async () => {
		const response = await patchProfile(customer, {
			...validUpdate(customer),
			email: otherCustomer.email,
		});

		expect(response.status).toBe(409);
		expect(response.body.fieldErrors).toEqual({
			email: "An account with this email already exists",
		});
		const stored = await prisma.user.findUniqueOrThrow({
			where: { id: customer.id },
		});
		expect(stored.email).toBe(customer.email);
	});

	it("requires authentication", async () => {
		const response = await request(app)
			.patch("/api/me")
			.send(validUpdate(customer));

		expect(response.status).toBe(401);
	});
});
