import { Router } from "express";
import { parseRegisterUserDto } from "../dtos/registerUserDto";
import { EmailAlreadyRegisteredError } from "../errors/emailAlreadyRegisteredError";
import { toUserResponseDto } from "../mappers/userMapper";
import type { UserService } from "../services/userService";

export function createUsersRouter(
	userService: Pick<UserService, "register">,
): Router {
	const router = Router();

	router.post("/", async (req, res, next) => {
		const parsedBody = parseRegisterUserDto(req.body);
		if (!parsedBody.success) {
			res.status(400).json({ error: parsedBody.message });
			return;
		}

		try {
			const user = await userService.register(parsedBody.data);
			res.status(201).json(toUserResponseDto(user));
		} catch (error) {
			if (error instanceof EmailAlreadyRegisteredError) {
				res.status(409).json({ error: error.message });
				return;
			}

			next(error);
		}
	});

	return router;
}
