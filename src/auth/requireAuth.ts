import type { NextFunction, Request, Response } from "express";
import { jwtVerify } from "jose";

export const TOKEN_ISSUER = "the-achievers-backend";
export const TOKEN_AUDIENCE = "the-achievers-api";

export function createRequireAuth(jwtSecret: string) {
	const signingKey = new TextEncoder().encode(jwtSecret);

	return async (req: Request, res: Response, next: NextFunction) => {
		const [scheme, token] = req.get("Authorization")?.split(" ") ?? [];
		if (scheme !== "Bearer" || !token) {
			res.status(401).json({ error: "Authentication required" });
			return;
		}

		try {
			const { payload } = await jwtVerify(token, signingKey, {
				algorithms: ["HS256"],
				issuer: TOKEN_ISSUER,
				audience: TOKEN_AUDIENCE,
				requiredClaims: ["exp"],
			});
			const userId = Number(payload.sub);
			if (!Number.isSafeInteger(userId) || userId < 1) {
				throw new Error("Invalid subject");
			}
			res.locals.userId = userId;
			next();
		} catch {
			res.status(401).json({ error: "Authentication required" });
		}
	};
}
