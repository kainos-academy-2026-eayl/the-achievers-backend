import type { Readable } from "node:stream";
import { SignJWT } from "jose";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app";
import type { ProductImage } from "../src/generated/prisma/client";
import type { ProductImageRepository } from "../src/products/productImageRepository";
import { ProductImageService } from "../src/products/productImageService";
import {
	type ImageStorage,
	MAX_IMAGE_BYTES,
} from "../src/products/productImageStorage";
import { noCart } from "./helpers";

const secret = "test-only-product-images-signing-secret";
const PNG = Buffer.concat([
	Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
	Buffer.from("png-body"),
]);
const JPEG = Buffer.concat([
	Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
	Buffer.from("jpeg-body"),
]);
const product = {
	id: "test-product",
	name: "Maple Cue",
	description: null,
	category: "Cues",
	pricePence: 8999,
	rating: null,
	reviewCount: 0,
	stock: 1,
	images: [],
};

function binaryParser(
	res: Readable,
	callback: (error: Error | null, body: Buffer) => void,
) {
	const chunks: Buffer[] = [];
	res.on("data", (chunk: Buffer) => chunks.push(chunk));
	res.on("end", () => callback(null, Buffer.concat(chunks)));
}

async function token(role = "admin") {
	return new SignJWT({ role })
		.setProtectedHeader({ alg: "HS256" })
		.setSubject("1")
		.setIssuer("the-achievers-backend")
		.setAudience("the-achievers-api")
		.setExpirationTime("1h")
		.sign(new TextEncoder().encode(secret));
}

function createFakes() {
	const blobs = new Map<string, Buffer>();
	let keyCount = 0;
	const storage: ImageStorage = {
		save: vi.fn(async (data: Buffer) => {
			keyCount += 1;
			const key = `stored-${keyCount}.bin`;
			blobs.set(key, data);
			return key;
		}),
		read: vi.fn(async (key: string) => {
			const data = blobs.get(key);
			if (data === undefined) throw new Error("missing blob");
			return data;
		}),
		remove: vi.fn(async (key: string) => {
			blobs.delete(key);
		}),
	};

	const rows = new Map<string, ProductImage>();
	let imageCount = 0;
	const makeImage = (
		data: {
			productId: string;
			storageKey: string;
			contentType: string;
			sizeBytes: number;
		},
		position: number,
	): ProductImage => {
		imageCount += 1;
		return {
			id: `image-${imageCount}`,
			...data,
			position,
			createdAt: new Date(),
		};
	};
	const nextPosition = (productId: string) =>
		Math.max(
			-1,
			...[...rows.values()]
				.filter((r) => r.productId === productId)
				.map((r) => r.position),
		) + 1;

	const repository: ProductImageRepository = {
		findImage: async (productId, imageId) => {
			const image = rows.get(imageId);
			return image && image.productId === productId ? image : null;
		},
		add: async (data) => {
			const image = makeImage(data, nextPosition(data.productId));
			rows.set(image.id, image);
			return image;
		},
		replace: async (productId, imageId, data) => {
			const existing = rows.get(imageId);
			if (!existing || existing.productId !== productId) return null;
			rows.delete(imageId);
			const image = makeImage(data, existing.position);
			rows.set(image.id, image);
			return { image, previousStorageKey: existing.storageKey };
		},
		delete: async (productId, imageId) => {
			const existing = rows.get(imageId);
			if (!existing || existing.productId !== productId) return null;
			rows.delete(imageId);
			return existing;
		},
	};

	const productRepository = {
		findById: async (id: string) => (id === product.id ? product : null),
	};
	const service = new ProductImageService(
		productRepository as never,
		repository,
		storage,
	);
	return { service, storage, blobs };
}

function setup() {
	const fakes = createFakes();
	const app = createApp(
		{ register: vi.fn() },
		{ getAll: vi.fn(), getById: vi.fn(), delete: vi.fn() },
		{ login: vi.fn() },
		noCart,
		secret,
		undefined,
		undefined,
		undefined,
		undefined,
		undefined,
		{ service: fakes.service, jwtSecret: secret },
	);
	return { app, ...fakes };
}

afterEach(() => vi.restoreAllMocks());

describe("POST /api/products/:id/images", () => {
	it("stores a valid image, returns 201 with a Location and serves it back", async () => {
		const { app, storage } = setup();
		const response = await request(app)
			.post("/api/products/test-product/images")
			.set("Authorization", `Bearer ${await token()}`)
			.attach("image", PNG, { filename: "cue.png", contentType: "image/png" })
			.expect(201);

		expect(response.headers.location).toBe(
			"/api/products/test-product/images/image-1",
		);
		expect(response.body).toEqual({
			id: "image-1",
			url: "/api/products/test-product/images/image-1",
			contentType: "image/png",
		});
		expect(response.headers["cache-control"]).toBe("no-store");
		expect(storage.save).toHaveBeenCalledWith(
			PNG,
			expect.objectContaining({ contentType: "image/png" }),
		);

		const served = await request(app)
			.get(response.headers.location as string)
			.buffer(true)
			.parse(binaryParser as never)
			.expect(200);
		expect(served.headers["content-type"]).toBe("image/png");
		expect(served.headers["cache-control"]).toBe(
			"public, max-age=31536000, immutable",
		);
		expect(served.headers["x-content-type-options"]).toBe("nosniff");
		expect(served.body).toEqual(PNG);
	});

	it("rejects files whose bytes are not JPEG, PNG or WebP, even if the MIME type claims an image", async () => {
		const { app, storage } = setup();
		const response = await request(app)
			.post("/api/products/test-product/images")
			.set("Authorization", `Bearer ${await token()}`)
			.attach("image", Buffer.from("<svg></svg>"), {
				filename: "logo.png",
				contentType: "image/png",
			})
			.expect(400);

		expect(response.body.fieldErrors.image).toBeDefined();
		expect(storage.save).not.toHaveBeenCalled();
	});

	it("rejects images over 20 MB with 413", async () => {
		const { app, storage } = setup();
		const oversized = Buffer.concat([PNG, Buffer.alloc(MAX_IMAGE_BYTES)]);
		const response = await request(app)
			.post("/api/products/test-product/images")
			.set("Authorization", `Bearer ${await token()}`)
			.attach("image", oversized, {
				filename: "big.png",
				contentType: "image/png",
			})
			.expect(413);

		expect(response.body).toEqual({ error: "Image is too large" });
		expect(storage.save).not.toHaveBeenCalled();
	});

	it("requires an admin token before accepting the upload", async () => {
		const { app, storage } = setup();
		await request(app)
			.post("/api/products/test-product/images")
			.attach("image", PNG, { filename: "cue.png", contentType: "image/png" })
			.expect(401);
		await request(app)
			.post("/api/products/test-product/images")
			.set("Authorization", `Bearer ${await token("user")}`)
			.attach("image", PNG, { filename: "cue.png", contentType: "image/png" })
			.expect(403);
		expect(storage.save).not.toHaveBeenCalled();
	});

	it("returns 404 for an unknown product without storing the file", async () => {
		const { app, storage } = setup();
		await request(app)
			.post("/api/products/missing/images")
			.set("Authorization", `Bearer ${await token()}`)
			.attach("image", PNG, { filename: "cue.png", contentType: "image/png" })
			.expect(404);
		expect(storage.save).not.toHaveBeenCalled();
	});
});

describe("PUT /api/products/:id/images/:imageId", () => {
	it("replaces the image, returns the new image and discards the previous file", async () => {
		const { app, storage, blobs } = setup();
		const authorization = `Bearer ${await token()}`;
		await request(app)
			.post("/api/products/test-product/images")
			.set("Authorization", authorization)
			.attach("image", PNG, { filename: "cue.png", contentType: "image/png" })
			.expect(201);

		const response = await request(app)
			.put("/api/products/test-product/images/image-1")
			.set("Authorization", authorization)
			.attach("image", JPEG, { filename: "cue.jpg", contentType: "image/jpeg" })
			.expect(200);

		expect(response.body.contentType).toBe("image/jpeg");
		expect(storage.remove).toHaveBeenCalledWith("stored-1.bin");
		expect(blobs.has("stored-1.bin")).toBe(false);
		await request(app)
			.get("/api/products/test-product/images/image-1")
			.expect(404);
	});

	it("returns 404 when the image does not belong to the product", async () => {
		const { app } = setup();
		await request(app)
			.put("/api/products/test-product/images/unknown")
			.set("Authorization", `Bearer ${await token()}`)
			.attach("image", PNG, { filename: "cue.png", contentType: "image/png" })
			.expect(404);
	});
});

describe("DELETE /api/products/:id/images/:imageId", () => {
	it("removes the image and its stored file", async () => {
		const { app, storage } = setup();
		const authorization = `Bearer ${await token()}`;
		await request(app)
			.post("/api/products/test-product/images")
			.set("Authorization", authorization)
			.attach("image", PNG, { filename: "cue.png", contentType: "image/png" })
			.expect(201);

		const response = await request(app)
			.delete("/api/products/test-product/images/image-1")
			.set("Authorization", authorization)
			.expect(204);

		expect(response.headers["cache-control"]).toBe("no-store");
		expect(storage.remove).toHaveBeenCalledWith("stored-1.bin");
		await request(app)
			.get("/api/products/test-product/images/image-1")
			.expect(404);
	});

	it("returns 404 for an unknown image and rejects non-admins", async () => {
		const { app } = setup();
		await request(app)
			.delete("/api/products/test-product/images/unknown")
			.set("Authorization", `Bearer ${await token()}`)
			.expect(404);
		await request(app)
			.delete("/api/products/test-product/images/unknown")
			.set("Authorization", `Bearer ${await token("user")}`)
			.expect(403);
	});
});

describe("product responses", () => {
	it("list each image with its URL", async () => {
		const getById = vi.fn().mockResolvedValue({
			...product,
			images: [
				{
					id: "image-9",
					productId: product.id,
					storageKey: "k.png",
					contentType: "image/png",
					sizeBytes: 10,
					position: 0,
					createdAt: new Date(),
				},
			],
		});
		const app = createApp(
			{ register: vi.fn() },
			{ getAll: vi.fn(), getById, delete: vi.fn() },
			{ login: vi.fn() },
			noCart,
			secret,
		);

		const response = await request(app)
			.get("/api/products/test-product")
			.expect(200);

		expect(response.body.images).toEqual([
			{
				id: "image-9",
				url: "/api/products/test-product/images/image-9",
				contentType: "image/png",
			},
		]);
	});
});
