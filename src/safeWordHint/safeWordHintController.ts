import { Router } from "express";
import { parseSafeWordHintQueryDto } from "../dtos/safeWordHintQueryDto";
import type { SafeWordHintService } from "./safeWordHintService";

const notFoundMessage = "No safe-word hint found for that email";

export function createSafeWordHintRouter(
	safeWordHintService: Pick<SafeWordHintService, "getSafeWordHint">,
): Router {
	const router = Router();

	router.get("/", async (req, res, next) => {
		res.set("Cache-Control", "no-store");
		const parsedQuery = parseSafeWordHintQueryDto(req.query);
		if (!parsedQuery.success) {
			res.status(400).json({ error: parsedQuery.message });
			return;
		}

		try {
			const safeWordHint = await safeWordHintService.getSafeWordHint(
				parsedQuery.data.email,
			);
			if (!safeWordHint) {
				res.status(404).json({ error: notFoundMessage });
				return;
			}

			res.status(200).json({ safeWordHint });
		} catch (error) {
			next(error);
		}
	});

	return router;
}
