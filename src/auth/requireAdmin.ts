import type { NextFunction, Request, Response } from "express";
import { jwtVerify } from "jose";

export function createRequireAdmin(jwtSecret: string) {
	const signingKey = new TextEncoder().encode(jwtSecret);

	return async (req: Request, res: Response, next: NextFunction) => {
		const [scheme, token] = (req.get("Authorization") ?? "").split(" ");
		if (scheme !== "Bearer" || !token) {
			res.status(401).json({ error: "Authentication required" });
			return;
		}

		try {
			const { payload } = await jwtVerify(token, signingKey, {
				algorithms: ["HS256"],
				issuer: "the-achievers-backend",
				audience: "the-achievers-api",
				requiredClaims: ["exp"],
			});
			if (payload.role !== "admin") {
				res.status(403).json({ error: "Admin access required" });
				return;
			}
			res.locals.userId = payload.sub;
			next();
		} catch {
			res.status(401).json({ error: "Invalid or expired token" });
		}
	};
}
