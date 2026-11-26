import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { seedDatabase } from "../src/seed";

function createPrismaMock() {
	return {
		user: { upsert: vi.fn().mockResolvedValue({ id: 7 }) },
		admin: { upsert: vi.fn().mockResolvedValue({}) },
		product: { upsert: vi.fn().mockResolvedValue({}) },
	};
}

describe("seedDatabase", () => {
	beforeEach(() => {
		vi.spyOn(console, "log").mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("upserts products without touching stock on existing products", async () => {
		const prisma = createPrismaMock();

		await seedDatabase(prisma as never, undefined);

		expect(prisma.product.upsert).toHaveBeenCalled();
		for (const [args] of prisma.product.upsert.mock.calls) {
			expect(args.update).not.toHaveProperty("stock");
			expect(args.create).toHaveProperty("stock");
		}
		expect(prisma.user.upsert).not.toHaveBeenCalled();
		expect(prisma.admin.upsert).not.toHaveBeenCalled();
	});

	it("creates the admin with a hashed password when one is provided", async () => {
		const prisma = createPrismaMock();
		const password = "a-long-admin-password";

		await seedDatabase(prisma as never, password);

		const [userArgs] = prisma.user.upsert.mock.calls[0] ?? [];
		expect(userArgs.where).toEqual({ email: "admin@example.com" });
		expect(userArgs.create.passwordHash).toMatch(/^\$argon2id\$/);
		expect(JSON.stringify(userArgs)).not.toContain(password);
		expect(prisma.admin.upsert).toHaveBeenCalledWith({
			where: { userId: 7 },
			update: {},
			create: { userId: 7 },
		});
	});

	it("rejects an admin password that is too short before writing anything", async () => {
		const prisma = createPrismaMock();

		await expect(seedDatabase(prisma as never, "short")).rejects.toThrow(
			"between 12 and 128 characters",
		);
		expect(prisma.user.upsert).not.toHaveBeenCalled();
		expect(prisma.product.upsert).not.toHaveBeenCalled();
	});
});
