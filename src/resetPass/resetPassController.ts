import { type NextFunction, type Response, Router } from "express";
import {
	parseResetPasswordDto,
	parseVerifySafeWordDto,
} from "../dtos/resetPasswordDto";
import { InvalidSafeWordError } from "../errors/invalidSafeWordError";
import type { ResetPassService } from "./resetPassService";

function respondToFailure(error: unknown, res: Response, next: NextFunction) {
	if (error instanceof InvalidSafeWordError) {
		res.status(401).json({ error: error.message });
		return;
	}
	next(error);
}

export function createResetPassRouter(
	service: Pick<ResetPassService, "verifySafeWord" | "resetPassword">,
): Router {
	const router = Router();
	router.use((_req, res, next) => {
		res.set("Cache-Control", "no-store");
		next();
	});

	router.post("/verify", async (req, res, next) => {
		const parsed = parseVerifySafeWordDto(req.body);
		if (!parsed.success) {
			res.status(400).json({ error: parsed.message });
			return;
		}

		try {
			await service.verifySafeWord(parsed.data);
			res.status(204).end();
		} catch (error) {
			respondToFailure(error, res, next);
		}
	});

	router.post("/", async (req, res, next) => {
		const parsed = parseResetPasswordDto(req.body);
		if (!parsed.success) {
			res.status(400).json({ error: parsed.message });
			return;
		}

		try {
			await service.resetPassword(parsed.data);
			res.status(204).end();
		} catch (error) {
			respondToFailure(error, res, next);
		}
	});

	return router;
}
