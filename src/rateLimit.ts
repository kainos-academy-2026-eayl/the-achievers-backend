import type { Request, RequestHandler } from "express";

export interface RateLimitOptions {
	limit: number;
	windowMs: number;
	now?: () => number;
	keyFor?: (req: Request) => string | undefined;
}

const sweepThreshold = 10_000;

// Fixed-window, in-memory limiter keyed by client IP
// unless keyFor returns a key. State is per process.
export function createRateLimiter({
	limit,
	windowMs,
	now = Date.now,
	keyFor,
}: RateLimitOptions): RequestHandler {
	const windows = new Map<string, { count: number; resetAt: number }>();

	return (req, res, next) => {
		const currentTime = now();
		if (windows.size >= sweepThreshold) {
			for (const [key, window] of windows) {
				if (window.resetAt <= currentTime) {
					windows.delete(key);
				}
			}
		}

		const key = keyFor?.(req) ?? req.ip ?? "unknown";
		let window = windows.get(key);
		if (!window || window.resetAt <= currentTime) {
			window = { count: 0, resetAt: currentTime + windowMs };
			windows.set(key, window);
		}

		window.count += 1;
		if (window.count > limit) {
			res.set("Cache-Control", "no-store");
			res.set(
				"Retry-After",
				String(Math.ceil((window.resetAt - currentTime) / 1000)),
			);
			res.status(429).json({ error: "Too many requests, try again later" });
			return;
		}

		next();
	};
}
