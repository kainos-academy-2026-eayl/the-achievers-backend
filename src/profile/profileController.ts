import { type RequestHandler, Router } from "express";
import { parseUpdateProfileDto } from "../dtos/updateProfileDto";
import { CurrentPasswordError } from "../errors/currentPasswordError";
import { EmailAlreadyRegisteredError } from "../errors/emailAlreadyRegisteredError";
import { ProfileNotFoundError } from "../errors/profileNotFoundError";
import { toProfileResponseDto } from "../mappers/userMapper";
import type { ProfileService } from "./profileService";

export function createProfileRouter(
	profileService: Pick<ProfileService, "getProfile" | "updateProfile">,
	requireAuth: RequestHandler,
): Router {
	const router = Router();

	router.use((_req, res, next) => {
		res.set("Cache-Control", "no-store");
		next();
	});
	router.use(requireAuth);

	router.get("/", async (_req, res, next) => {
		try {
			const user = await profileService.getProfile(res.locals.userId);
			res.json(toProfileResponseDto(user));
		} catch (error) {
			if (error instanceof ProfileNotFoundError) {
				res.status(404).json({ error: error.message });
				return;
			}
			next(error);
		}
	});

	router.patch("/", async (req, res, next) => {
		const parsedBody = parseUpdateProfileDto(req.body);
		if (!parsedBody.success) {
			res.status(400).json({
				error: parsedBody.message,
				fieldErrors: parsedBody.fieldErrors,
			});
			return;
		}

		try {
			const user = await profileService.updateProfile(
				res.locals.userId,
				parsedBody.data,
			);
			res.json(toProfileResponseDto(user));
		} catch (error) {
			if (error instanceof CurrentPasswordError) {
				res.status(400).json({
					error: "Validation failed",
					fieldErrors: { currentPassword: error.message },
				});
				return;
			}
			if (error instanceof EmailAlreadyRegisteredError) {
				res.status(409).json({
					error: error.message,
					fieldErrors: { email: error.message },
				});
				return;
			}
			if (error instanceof ProfileNotFoundError) {
				res.status(404).json({ error: error.message });
				return;
			}
			next(error);
		}
	});

	return router;
}
