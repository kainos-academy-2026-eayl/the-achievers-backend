import { randomUUID } from "node:crypto";
import { SignJWT } from "jose";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app";
import { PrismaCartRepository } from "../src/cart/cartRepository";
import { CartService } from "../src/cart/cartService";
import { PrismaOrderRepository } from "../src/orders/orderRepository";
import { OrderService } from "../src/orders/orderService";
import { createPrismaClient } from "../src/prismaClient";
import { PrismaProductRepository } from "../src/products/productRepository";
import { ProductService } from "../src/products/productService";

const noRegistration = { register: vi.fn() };
const noLogin = { login: vi.fn() };

const describeWithDatabase = describe.skipIf(!process.env.DATABASE_URL);
const jwtSecret = "orders-integration-test-secret-with-at-least-32-bytes";
const fixturePrefix = `orders-integration-${randomUUID()}`;
const productIds = {
    cue: `${fixturePrefix}-cue`,
    chalk: `${fixturePrefix}-chalk`,
};
const shippingAddress = {
    addressLine1: "1 Cue Street",
    city: "Belfast",
    postcode: "bt1 1aa",
};

describeWithDatabase("orders API with PostgreSQL", () => {
    if (!process.env.DATABASE_URL) return;

    const prisma = createPrismaClient();
    const productRepository = new PrismaProductRepository(prisma);
    const app = createApp(
        noRegistration,
        new ProductService(productRepository),
        noLogin,
        new CartService(new PrismaCartRepository(prisma), productRepository),
        undefined,
        undefined,
        {
            service: new OrderService(new PrismaOrderRepository(prisma)),
            jwtSecret,
        },
    );

    const cartIds: string[] = [];
    const userIds: number[] = [];

    function token(userId: number, role: "user" | "admin" = "user") {
        return new SignJWT({ role })
            .setProtectedHeader({ alg: "HS256", typ: "JWT" })
            .setSubject(String(userId))
            .setIssuer("the-achievers-backend")
            .setAudience("the-achievers-api")
            .setIssuedAt()
            .setExpirationTime("1h")
            .sign(new TextEncoder().encode(jwtSecret));
    }

    async function createUser() {
        const user = await prisma.user.create({
            data: {
                email: `${fixturePrefix}-${randomUUID()}@example.com`,
                name: "Orders Test",
                passwordHash: "not-a-real-hash",
            },
        });
        userIds.push(user.id);
        return { id: user.id, auth: `Bearer ${await token(user.id)}` };
    }

    async function cartWith(items: Record<string, number>) {
        const cartId = randomUUID();
        cartIds.push(cartId);
        for (const [productId, quantity] of Object.entries(items)) {
            await request(app)
                .post("/api/cart/items")
                .set("X-Cart-Id", cartId)
                .send({ productId, quantity })
                .expect(200);
        }
        return cartId;
    }

    function checkout(
        auth: string,
        cartId: string,
        body: object = { shippingAddress },
    ) {
        return request(app)
            .post("/api/orders")
            .set("Authorization", auth)
            .set("X-Cart-Id", cartId)
            .send(body);
    }

    async function stockOf(productId: string) {
        const product = await prisma.product.findUniqueOrThrow({
            where: { id: productId },
        });
        return product.stock;
    }

    beforeAll(async () => {
        await prisma.product.createMany({
            data: [
                {
                    id: productIds.cue,
                    name: "Orders Test Cue",
                    category: "Integration",
                    pricePence: 3_000,
                    stock: 5,
                },
                {
                    id: productIds.chalk,
                    name: "Orders Test Chalk",
                    category: "Integration",
                    pricePence: 250,
                    stock: 100,
                },
            ],
        });
    });

    afterAll(async () => {
        await prisma.order.deleteMany({ where: { userId: { in: userIds } } });
        await prisma.user.deleteMany({ where: { id: { in: userIds } } });
        await prisma.cart.deleteMany({ where: { id: { in: cartIds } } });
        await prisma.product.deleteMany({
            where: { id: { in: Object.values(productIds) } },
        });
        await prisma.$disconnect();
    });

    it("requires login for checkout and order history", async () => {
        const cartId = await cartWith({ [productIds.chalk]: 1 });

        const anonymousCheckout = await request(app)
            .post("/api/orders")
            .set("X-Cart-Id", cartId)
            .send({ shippingAddress });
        const anonymousList = await request(app).get("/api/orders");

        expect(anonymousCheckout.status).toBe(401);
        expect(anonymousList.status).toBe(401);
        expect(await stockOf(productIds.chalk)).toBe(100);
    });

    it("creates an order, deducts stock and empties the cart", async () => {
        const customer = await createUser();
        const cartId = await cartWith({
            [productIds.cue]: 2,
            [productIds.chalk]: 1,
        });

        const response = await checkout(customer.auth, cartId);

        expect(response.status).toBe(201);
        expect(response.body).toEqual({
            id: expect.any(String),
            reference: expect.stringMatching(/^ORD-[A-Z2-9]{8}$/),
            status: "placed",
            items: [
                {
                    productId: productIds.chalk,
                    name: "Orders Test Chalk",
                    price: 2.5,
                    quantity: 1,
                },
                {
                    productId: productIds.cue,
                    name: "Orders Test Cue",
                    price: 30,
                    quantity: 2,
                },
            ],
            subtotal: 62.5,
            shipping: 0,
            total: 62.5,
            shippingAddress: {
                addressLine1: "1 Cue Street",
                addressLine2: null,
                city: "Belfast",
                postcode: "BT1 1AA",
            },
            createdAt: expect.any(String),
        });
        expect(await stockOf(productIds.cue)).toBe(3);
        const cart = await request(app).get("/api/cart").set("X-Cart-Id", cartId);
        expect(cart.body.items).toEqual([]);

        const list = await request(app)
            .get("/api/orders")
            .set("Authorization", customer.auth);
        expect(list.status).toBe(200);
        expect(list.body).toEqual([response.body]);

        const single = await request(app)
            .get(`/api/orders/${response.body.id}`)
            .set("Authorization", customer.auth);
        expect(single.status).toBe(200);
        expect(single.body).toEqual(response.body);
    });

    it("does not let a customer see another customer's order", async () => {
        const owner = await createUser();
        const other = await createUser();
        const order = await checkout(
            owner.auth,
            await cartWith({ [productIds.chalk]: 1 }),
        );

        const response = await request(app)
            .get(`/api/orders/${order.body.id}`)
            .set("Authorization", other.auth);
        const otherList = await request(app)
            .get("/api/orders")
            .set("Authorization", other.auth);

        expect(response.status).toBe(404);
        expect(otherList.body).toEqual([]);
    });

    it("rejects checkout without changing anything when stock is short", async () => {
        const customer = await createUser();
        const cartId = await cartWith({
            [productIds.chalk]: 1,
            [productIds.cue]: 50,
        });
        const chalkBefore = await stockOf(productIds.chalk);
        const cueBefore = await stockOf(productIds.cue);

        const response = await checkout(customer.auth, cartId);

        expect(response.status).toBe(409);
        expect(response.body).toEqual({
            error: "Not enough stock for Orders Test Cue",
        });
        expect(await stockOf(productIds.chalk)).toBe(chalkBefore);
        expect(await stockOf(productIds.cue)).toBe(cueBefore);
        const cart = await request(app).get("/api/cart").set("X-Cart-Id", cartId);
        expect(cart.body.items).toHaveLength(2);
        expect(await prisma.order.count({ where: { userId: customer.id } })).toBe(
            0,
        );
    });

    it("rejects an empty cart and a missing shipping address", async () => {
        const customer = await createUser();

        const empty = await checkout(customer.auth, randomUUID());
        const noAddress = await checkout(
            customer.auth,
            await cartWith({ [productIds.chalk]: 1 }),
            {},
        );

        expect(empty.status).toBe(400);
        expect(empty.body).toEqual({ error: "Cart is empty" });
        expect(noAddress.status).toBe(400);
        expect(noAddress.body.fieldErrors).toEqual({
            shippingAddress: "Enter a shipping address",
        });
    });

    it("lets admins list and view every order, but not customers", async () => {
        const customer = await createUser();
        const order = await checkout(
            customer.auth,
            await cartWith({ [productIds.chalk]: 2 }),
        );
        const adminAuth = `Bearer ${await token(customer.id, "admin")}`;

        const forbidden = await request(app)
            .get("/api/admin/orders")
            .set("Authorization", customer.auth);
        const list = await request(app)
            .get("/api/admin/orders?page=1&pageSize=100")
            .set("Authorization", adminAuth);
        const single = await request(app)
            .get(`/api/admin/orders/${order.body.id}`)
            .set("Authorization", adminAuth);
        const badPage = await request(app)
            .get("/api/admin/orders?pageSize=1000")
            .set("Authorization", adminAuth);

        expect(forbidden.status).toBe(403);
        expect(list.status).toBe(200);
        expect(list.body).toMatchObject({ page: 1, pageSize: 100 });
        expect(list.body.total).toBeGreaterThanOrEqual(1);
        expect(single.status).toBe(200);
        expect(single.body).toEqual({
            ...order.body,
            customer: {
                id: customer.id,
                email: expect.any(String),
                name: "Orders Test",
            },
        });
        expect(badPage.status).toBe(400);
    });
});
