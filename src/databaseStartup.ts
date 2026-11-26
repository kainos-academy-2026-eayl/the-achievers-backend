import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { Client } from "pg";

export async function waitForDatabase(
	checkConnection: () => Promise<void>,
	attempts = 30,
	intervalMs = 2_000,
): Promise<void> {
	for (let attempt = 1; attempt <= attempts; attempt++) {
		try {
			await checkConnection();
			return;
		} catch (error) {
			if (attempt === attempts) {
				throw new Error("PostgreSQL did not become ready", { cause: error });
			}
			console.warn(`PostgreSQL is not ready (attempt ${attempt}/${attempts})`);
			await delay(intervalMs);
		}
	}
}

function runMigrations(): Promise<void> {
	return new Promise((resolve, reject) => {
		const child = spawn(
			process.execPath,
			["node_modules/prisma/build/index.js", "migrate", "deploy"],
			{ stdio: "inherit" },
		);
		child.once("error", reject);
		child.once("close", (code, signal) => {
			if (code === 0) {
				resolve();
			} else {
				reject(
					new Error(
						`Prisma migrations failed (${signal ? `signal ${signal}` : `exit code ${code}`})`,
					),
				);
			}
		});
	});
}

export async function bootstrapDatabase(
	connectionString: string | undefined,
): Promise<void> {
	if (!connectionString) {
		throw new Error("DATABASE_URL environment variable is not set");
	}

	let url: URL;
	try {
		url = new URL(connectionString);
	} catch {
		throw new Error("DATABASE_URL is not a valid URL");
	}
	if (
		!["postgres:", "postgresql:"].includes(url.protocol) ||
		!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
		url.searchParams.has("host") ||
		url.searchParams.has("hostaddr")
	) {
		throw new Error(
			"Database bootstrap requires a local PostgreSQL DATABASE_URL",
		);
	}

	await waitForDatabase(async () => {
		const client = new Client({
			connectionString,
			connectionTimeoutMillis: 2_000,
			query_timeout: 2_000,
		});
		try {
			await client.connect();
			await client.query("SELECT 1");
		} finally {
			await client.end();
		}
	});
	await runMigrations();
}
