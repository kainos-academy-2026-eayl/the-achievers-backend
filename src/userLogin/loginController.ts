import { Router } from "express";
import { parseLoginUserDto } from "../dtos/loginUserDto";
import { InvalidCredentialsError } from "../errors/invalidCredentialsError";
import type { LoginService } from "./loginService";

export function createLoginRouter(
	loginService: Pick<LoginService, "login">,
): Router {
	const router = Router();

	router.post("/", async (req, res, next) => {
		res.set("Cache-Control", "no-store");
		const parsedBody = parseLoginUserDto(req.body);
		if (!parsedBody.success) {
			res.status(400).json({ error: parsedBody.message });
			return;
		}

		try {
			const result = await loginService.login(parsedBody.data);
			res.status(200).json(result);
		} catch (error) {
			if (error instanceof InvalidCredentialsError) {
				res.status(401).json({ error: error.message });
				return;
			}

			next(error);
		}
	});

	return router;
}
