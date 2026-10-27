import { SignJWT } from "jose";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app";
import { EmailAlreadyRegisteredError } from "../src/errors/emailAlreadyRegisteredError";
import type { User } from "../src/generated/prisma/client";
import type {
    ProfileRepository,
    ProfileUpdateData,
} from "../src/profile/profileRepository";
import { ProfileService } from "../src/profile/profileService";
import { emptyProfileFields, noCart } from "./helpers";

const jwtSecret = "test-only-secret-not-for-production-123456789";
const createdAt = new Date("2026-01-01T00:00:00.000Z");

function makeUser(id: number, email: string): User {
    return {
        id,
        email,
        name: `Customer ${id}`,
        passwordHash: `hash-for-${id}`,
        ...emptyProfileFields,
        createdAt,
    };
}

function signToken(
    sub: string,
    options: { secret?: string; issuer?: string; expired?: boolean; } = {},
) {
    const now = Math.floor(Date.now() / 1000);
    return new SignJWT({})
        .setProtectedHeader({ alg: "HS256", typ: "JWT" })
        .setSubject(sub)
        .setIssuer(options.issuer ?? "the-achievers-backend")
        .setAudience("the-achievers-api")
        .setIssuedAt(now - 7200)
        .setExpirationTime(options.expired ? now - 3600 : now + 3600)
        .sign(new TextEncoder().encode(options.secret ?? jwtSecret));
}

function setup() {
    const users = new Map<number, User>([
        [1, makeUser(1, "first@example.com")],
        [2, makeUser(2, "second@example.com")],
    ]);
    const repository: ProfileRepository = {
        findById: vi.fn(async (id: number) => users.get(id) ?? null),
        update: vi.fn(async (id: number, data: ProfileUpdateData) => {
            const taken = [...users.values()].some(
                (other) => other.id !== id && other.email === data.email,
            );
            if (taken) throw new EmailAlreadyRegisteredError();
            const updated = { ...(users.get(id) as User), ...data };
            users.set(id, updated);
            return updated;
        }),
    };
    const verifyPassword = vi.fn(
        async (hash: string, password: string) =>
            hash === "hash-for-1" && password === "CorrectPassword123",
    );
    const app = createApp(
        { register: vi.fn() },
        { getAll: async () => [], getById: async () => null },
        { login: vi.fn() },
        noCart,
        undefined,
        { service: new ProfileService(repository, verifyPassword), jwtSecret },
    );
    return { app, users, repository };
}

const validUpdate = {
    name: "  Updated Name  ",
    email: "first@example.com",
    phone: "07123 456 789",
    addressLine1: "1 Cue Street",
    addressLine2: "",
    city: "Belfast",
    postcode: "bt1 1aa",
    currentPassword: "CorrectPassword123",
};

describe("GET /api/me", () => {
    it("returns the logged-in customer's profile without sensitive fields", async () => {
        const { app } = setup();
        const response = await request(app)
            .get("/api/me")
            .set("Authorization", `Bearer ${await signToken("1")}`);

        expect(response.status).toBe(200);
        expect(response.headers["cache-control"]).toBe("no-store");
        expect(response.body).toEqual({
            email: "first@example.com",
            name: "Customer 1",
            ...emptyProfileFields,
            createdAt: createdAt.toISOString(),
        });
        expect(response.body).not.toHaveProperty("passwordHash");
        expect(response.body).not.toHaveProperty("id");
    });

    it("only ever returns the profile belonging to the token", async () => {
        const { app } = setup();
        const response = await request(app)
            .get("/api/me?id=1")
            .set("Authorization", `Bearer ${await signToken("2")}`);

        expect(response.body.email).toBe("second@example.com");
    });

    it.each([
        ["no header", undefined],
        ["wrong scheme", "Basic abc"],
        ["garbage token", "Bearer not-a-jwt"],
    ])("rejects requests with %s", async (_label, header) => {
        const { app } = setup();
        const req = request(app).get("/api/me");
        if (header) req.set("Authorization", header);
        const response = await req;

        expect(response.status).toBe(401);
        expect(response.body).toEqual({ error: "Authentication required" });
    });

    it.each([
        ["expired", { expired: true }],
        ["wrong secret", { secret: "different-test-only-secret-123456789" }],
        ["wrong issuer", { issuer: "someone-else" }],
    ])("rejects %s tokens", async (_label, options) => {
        const { app } = setup();
        const response = await request(app)
            .get("/api/me")
            .set("Authorization", `Bearer ${await signToken("1", options)}`);

        expect(response.status).toBe(401);
    });

    it("returns 404 when the user no longer exists", async () => {
        const { app } = setup();
        const response = await request(app)
            .get("/api/me")
            .set("Authorization", `Bearer ${await signToken("99")}`);

        expect(response.status).toBe(404);
    });
});

describe("PATCH /api/me", () => {
    it("saves valid changes and returns the normalised profile", async () => {
        const { app, users } = setup();
        const response = await request(app)
            .patch("/api/me")
            .set("Authorization", `Bearer ${await signToken("1")}`)
            .send(validUpdate);

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
            name: "Updated Name",
            email: "first@example.com",
            phone: "07123456789",
            addressLine1: "1 Cue Street",
            addressLine2: null,
            city: "Belfast",
            postcode: "BT1 1AA",
        });
        expect(users.get(1)?.name).toBe("Updated Name");
        expect(users.get(2)?.name).toBe("Customer 2");
    });

    it("allows phone and address to be cleared", async () => {
        const { app } = setup();
        const response = await request(app)
            .patch("/api/me")
            .set("Authorization", `Bearer ${await signToken("1")}`)
            .send({
                name: "Customer 1",
                email: "first@example.com",
                currentPassword: "CorrectPassword123",
            });

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject(emptyProfileFields);
    });

    it("returns field errors for invalid data and saves nothing", async () => {
        const { app, repository } = setup();
        const response = await request(app)
            .patch("/api/me")
            .set("Authorization", `Bearer ${await signToken("1")}`)
            .send({
                name: " ",
                email: "not-an-email",
                phone: "12345",
                addressLine1: "1 Cue Street",
                city: "",
                postcode: "NOPE",
            });

        expect(response.status).toBe(400);
        expect(response.body).toEqual({
            error: "Validation failed",
            fieldErrors: {
                name: "Enter your name",
                email: "Enter a valid email address, for example name@example.com",
                phone: "Enter a valid UK phone number, for example 07123 456789",
                city: "Enter your town or city",
                postcode: "Enter a valid UK postcode, for example SW1A 1AA",
                currentPassword: "Enter your current password to save changes",
            },
        });
        expect(repository.update).not.toHaveBeenCalled();
    });

    it.each([null, [], "text"])("rejects a non-object body: %j", async (body) => {
        const { app } = setup();
        const response = await request(app)
            .patch("/api/me")
            .set("Authorization", `Bearer ${await signToken("1")}`)
            .set("Content-Type", "application/json")
            .send(JSON.stringify(body));

        expect(response.status).toBe(400);
    });

    it("requires the correct current password for any change", async () => {
        const { app, repository } = setup();
        const token = await signToken("1");
        const nameOnly = { ...validUpdate, currentPassword: undefined };

        const missing = await request(app)
            .patch("/api/me")
            .set("Authorization", `Bearer ${token}`)
            .send(nameOnly);
        expect(missing.status).toBe(400);
        expect(missing.body.fieldErrors).toEqual({
            currentPassword: "Enter your current password to save changes",
        });

        const wrong = await request(app)
            .patch("/api/me")
            .set("Authorization", `Bearer ${token}`)
            .send({ ...nameOnly, currentPassword: "WrongPassword123" });
        expect(wrong.status).toBe(400);
        expect(wrong.body.fieldErrors).toEqual({
            currentPassword: "Your current password is incorrect",
        });
        expect(repository.update).not.toHaveBeenCalled();

        const correct = await request(app)
            .patch("/api/me")
            .set("Authorization", `Bearer ${token}`)
            .send({ ...validUpdate, email: "new@example.com" });
        expect(correct.status).toBe(200);
        expect(correct.body.email).toBe("new@example.com");
    });

    it("rejects an email that belongs to another customer", async () => {
        const { app } = setup();
        const response = await request(app)
            .patch("/api/me")
            .set("Authorization", `Bearer ${await signToken("1")}`)
            .send({
                ...validUpdate,
                email: "second@example.com",
                currentPassword: "CorrectPassword123",
            });

        expect(response.status).toBe(409);
        expect(response.body.fieldErrors).toEqual({
            email: "An account with this email already exists",
        });
    });

    it("requires authentication", async () => {
        const { app, repository } = setup();
        const response = await request(app).patch("/api/me").send(validUpdate);

        expect(response.status).toBe(401);
        expect(repository.update).not.toHaveBeenCalled();
    });
});
