import { randomUUID } from "node:crypto";
import { SignJWT } from "jose";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app";
import { createPrismaClient } from "../src/prismaClient";
import { PrismaProductRepository } from "../src/products/productRepository";
import { ProductService } from "../src/products/productService";
import { PrismaReviewRepository } from "../src/reviews/reviewRepository";
import { ReviewService } from "../src/reviews/reviewService";
import { noCart } from "./helpers";

const describeWithDatabase = describe.skipIf(!process.env.DATABASE_URL);
const jwtSecret = "reviews-integration-test-secret-with-at-least-32-bytes";
const fixturePrefix = `reviews-integration-${randomUUID()}`;
const productIds = {
	cue: `${fixturePrefix}-cue`,
	chalk: `${fixturePrefix}-chalk`,
	rated: `${fixturePrefix}-rated`,
};
const EIGHT_DAYS_AGO = () => new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);

describeWithDatabase("reviews API with PostgreSQL", () => {
	if (!process.env.DATABASE_URL) return;

	const prisma = createPrismaClient();
	const app = createApp(
		{ register: vi.fn() },
		new ProductService(new PrismaProductRepository(prisma)),
		{ login: vi.fn() },
		noCart,
		jwtSecret,
		undefined,
		undefined,
		undefined,
		{
			service: new ReviewService(new PrismaReviewRepository(prisma)),
			jwtSecret,
		},
	);
	const userIds: number[] = [];

	async function createUser() {
		const user = await prisma.user.create({
			data: {
				email: `${fixturePrefix}-${randomUUID()}@example.com`,
				name: "Reviews Test",
				passwordHash: "not-a-real-hash",
			},
		});
		userIds.push(user.id);
		const token = await new SignJWT({ role: "user" })
			.setProtectedHeader({ alg: "HS256", typ: "JWT" })
			.setSubject(String(user.id))
			.setIssuer("the-achievers-backend")
			.setAudience("the-achievers-api")
			.setIssuedAt()
			.setExpirationTime("1h")
			.sign(new TextEncoder().encode(jwtSecret));
		return { id: user.id, auth: `Bearer ${token}` };
	}

	async function createOrder(
		userId: number,
		{
			status = "placed",
			createdAt = EIGHT_DAYS_AGO(),
			products = [productIds.cue, productIds.chalk],
		}: { status?: string; createdAt?: Date; products?: string[] } = {},
	) {
		const order = await prisma.order.create({
			data: {
				id: randomUUID(),
				reference: `REV-${randomUUID().slice(0, 8).toUpperCase()}`,
				userId,
				status,
				subtotalPence: 1000,
				shippingPence: 0,
				totalPence: 1000,
				addressLine1: "1 Cue Street",
				city: "Belfast",
				postcode: "BT1 1AA",
				createdAt,
				items: {
					create: products.map((productId) => ({
						productId,
						productName: productId,
						unitPricePence: 500,
						quantity: 1,
					})),
				},
			},
		});
		return order.id;
	}

	function saveReview(
		auth: string,
		productId: string,
		body: Record<string, unknown>,
	) {
		return request(app)
			.put(`/api/reviews/${encodeURIComponent(productId)}`)
			.set("Authorization", auth)
			.send(body);
	}

	async function productRating(productId: string) {
		const product = await prisma.product.findUniqueOrThrow({
			where: { id: productId },
		});
		return { rating: product.rating, reviewCount: product.reviewCount };
	}

	beforeAll(async () => {
		await prisma.product.createMany({
			data: Object.values(productIds).map((id) => ({
				id,
				name: id,
				category: "Integration",
				pricePence: 500,
				stock: 10,
			})),
		});
	});

	afterAll(async () => {
		await prisma.order.deleteMany({ where: { userId: { in: userIds } } });
		await prisma.user.deleteMany({ where: { id: { in: userIds } } });
		await prisma.product.deleteMany({
			where: { id: { in: Object.values(productIds) } },
		});
		await prisma.$disconnect();
	});

	it("requires login", async () => {
		const list = await request(app).get("/api/reviews/me");
		const save = await request(app)
			.put(`/api/reviews/${productIds.cue}`)
			.send({ orderId: randomUUID(), rating: 5 });

		expect(list.status).toBe(401);
		expect(save.status).toBe(401);
	});

	it("creates a review for a delivered purchase and updates the product rating", async () => {
		const customer = await createUser();
		const orderId = await createOrder(customer.id);

		const response = await saveReview(customer.auth, productIds.cue, {
			orderId,
			rating: 4,
			comment: "  Lovely cue  ",
		});

		expect(response.status).toBe(201);
		expect(response.body).toMatchObject({
			productId: productIds.cue,
			orderId,
			rating: 4,
			comment: "Lovely cue",
		});
		expect(await productRating(productIds.cue)).toEqual({
			rating: 4,
			reviewCount: 1,
		});

		const mine = await request(app)
			.get("/api/reviews/me")
			.set("Authorization", customer.auth)
			.expect(200);
		expect(mine.body).toHaveLength(1);
		expect(mine.headers["cache-control"]).toBe("no-store");
	});

	it("edits the existing review instead of creating a second one", async () => {
		const customer = await createUser();
		const orderId = await createOrder(customer.id);
		await saveReview(customer.auth, productIds.chalk, {
			orderId,
			rating: 2,
		}).expect(201);

		const response = await saveReview(customer.auth, productIds.chalk, {
			orderId,
			rating: 5,
			comment: "Changed my mind",
		});

		expect(response.status).toBe(200);
		expect(response.body).toMatchObject({
			rating: 5,
			comment: "Changed my mind",
		});
		expect(
			await prisma.review.count({
				where: { userId: customer.id, productId: productIds.chalk },
			}),
		).toBe(1);
	});

	it("averages ratings across customers to one decimal place", async () => {
		const ratings = [5, 4, 4];
		for (const rating of ratings) {
			const customer = await createUser();
			const orderId = await createOrder(customer.id, {
				products: [productIds.rated],
			});
			await saveReview(customer.auth, productIds.rated, {
				orderId,
				rating,
			}).expect(201);
		}

		// 13 / 3 = 4.333...
		expect(await productRating(productIds.rated)).toEqual({
			rating: 4.3,
			reviewCount: 3,
		});
	});

	it.each([
		["a recent order that is not delivered yet", { createdAt: new Date() }],
		["a cancelled order", { status: "cancelled" }],
	])("refuses reviews for %s", async (_label, options) => {
		const customer = await createUser();
		const orderId = await createOrder(customer.id, options);

		const response = await saveReview(customer.auth, productIds.cue, {
			orderId,
			rating: 5,
		});

		expect(response.status).toBe(403);
		expect(response.body.error).toBe(
			"Reviews are only available for delivered orders",
		);
	});

	it("refuses reviews for products that were not in the order", async () => {
		const customer = await createUser();
		const orderId = await createOrder(customer.id, {
			products: [productIds.cue],
		});

		const response = await saveReview(customer.auth, productIds.chalk, {
			orderId,
			rating: 5,
		});

		expect(response.status).toBe(403);
		expect(response.body.error).toBe(
			"You can only review products you purchased",
		);
	});

	it("does not let a customer review using another customer's order", async () => {
		const owner = await createUser();
		const intruder = await createUser();
		const orderId = await createOrder(owner.id);

		const response = await saveReview(intruder.auth, productIds.cue, {
			orderId,
			rating: 1,
		});

		expect(response.status).toBe(404);
		expect(await prisma.review.count({ where: { userId: intruder.id } })).toBe(
			0,
		);
	});

	it("only lists the customer's own reviews", async () => {
		const first = await createUser();
		const second = await createUser();
		await saveReview(first.auth, productIds.cue, {
			orderId: await createOrder(first.id),
			rating: 3,
		}).expect(201);

		const response = await request(app)
			.get("/api/reviews/me")
			.set("Authorization", second.auth)
			.expect(200);

		expect(response.body).toEqual([]);
	});

	it.each([
		[{ rating: 0 }],
		[{ rating: 6 }],
		[{ rating: 4.5 }],
		[{ rating: "5" }],
		[{ rating: 5, comment: "a".repeat(1001) }],
		[{ rating: 5, comment: 42 }],
	])("rejects invalid review %j", async (body) => {
		const customer = await createUser();
		const orderId = await createOrder(customer.id);

		const response = await saveReview(customer.auth, productIds.cue, {
			orderId,
			...body,
		});

		expect(response.status).toBe(400);
	});

	it("rejects a malformed order id", async () => {
		const customer = await createUser();

		const response = await saveReview(customer.auth, productIds.cue, {
			orderId: "not-a-uuid",
			rating: 5,
		});

		expect(response.status).toBe(400);
	});
});
