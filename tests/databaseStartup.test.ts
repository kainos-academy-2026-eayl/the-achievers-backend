import { EventEmitter } from "node:events";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	connect: vi.fn(),
	query: vi.fn(),
	end: vi.fn(),
	spawn: vi.fn(),
}));

vi.mock("pg", () => ({
	Client: class {
		connect = mocks.connect;
		query = mocks.query;
		end = mocks.end;
	},
}));

vi.mock("node:child_process", () => ({
	spawn: mocks.spawn,
}));

import { bootstrapDatabase, waitForDatabase } from "../src/databaseStartup";

describe("database startup", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.connect.mockResolvedValue(undefined);
		mocks.query.mockResolvedValue(undefined);
		mocks.end.mockResolvedValue(undefined);
	});

	it("retries a failed connection before proceeding", async () => {
		const check = vi
			.fn()
			.mockRejectedValueOnce(new Error("not ready"))
			.mockResolvedValue(undefined);
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

		await waitForDatabase(check, 2, 0);

		expect(check).toHaveBeenCalledTimes(2);
		expect(warn).toHaveBeenCalledOnce();
		warn.mockRestore();
	});

	it("fails after the configured connection attempts", async () => {
		const check = vi.fn().mockRejectedValue(new Error("not ready"));
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

		await expect(waitForDatabase(check, 2, 0)).rejects.toThrow(
			"PostgreSQL did not become ready",
		);
		expect(check).toHaveBeenCalledTimes(2);
		warn.mockRestore();
	});

	it("checks the database before running migrations", async () => {
		mocks.spawn.mockImplementation(() => {
			expect(mocks.query).toHaveBeenCalledWith("SELECT 1");
			const child = new EventEmitter();
			queueMicrotask(() => child.emit("close", 0, null));
			return child;
		});

		await bootstrapDatabase(
			"postgresql://user:password@localhost:5432/app_dev",
		);

		expect(mocks.end).toHaveBeenCalledOnce();
		expect(mocks.spawn).toHaveBeenCalledWith(
			process.execPath,
			["node_modules/prisma/build/index.js", "migrate", "deploy"],
			{ stdio: "inherit" },
		);
	});

	it("rejects remote databases without running migrations", async () => {
		await expect(
			bootstrapDatabase("postgresql://user:password@remote.example/app_dev"),
		).rejects.toThrow("Database bootstrap requires a local PostgreSQL");
		await expect(
			bootstrapDatabase(
				"postgresql://user:password@localhost/app_dev?host=remote.example",
			),
		).rejects.toThrow("Database bootstrap requires a local PostgreSQL");
		expect(mocks.connect).not.toHaveBeenCalled();
		expect(mocks.spawn).not.toHaveBeenCalled();
	});

	it("fails startup when migrations fail", async () => {
		mocks.spawn.mockImplementation(() => {
			const child = new EventEmitter();
			queueMicrotask(() => child.emit("close", 1, null));
			return child;
		});

		await expect(
			bootstrapDatabase("postgresql://user:password@localhost:5432/app_dev"),
		).rejects.toThrow("Prisma migrations failed (exit code 1)");
	});
});
