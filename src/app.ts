import express, {
	type Express,
	type NextFunction,
	type Request,
	type Response,
} from "express";
import { createProductsRouter } from "./controllers/productController";
import { createUsersRouter } from "./controllers/userController";
import type { ProductService } from "./services/productService";
import type { UserService } from "./services/userService";

function getClientErrorStatus(error: unknown): number | undefined {
	if (typeof error !== "object" || error === null || !("status" in error)) {
		return undefined;
	}

	const { status } = error;
	return typeof status === "number" && status >= 400 && status < 500
		? status
		: undefined;
}

export function createApp(
	userService: Pick<UserService, "register">,
	productService: Pick<ProductService, "getAll" | "getById">,
): Express {
	const app = express();

	app.use(express.json({ limit: "10kb" }));

	app.get("/health", (_req: Request, res: Response) => {
		res.status(200).json({ status: "UP", time: new Date().toISOString() });
	});

	const usersRouter = createUsersRouter(userService);
	app.use("/api/register", usersRouter);
	app.use("/api/products", createProductsRouter(productService));

	app.use(
		(error: unknown, _req: Request, res: Response, _next: NextFunction) => {
			const clientErrorStatus = getClientErrorStatus(error);
			if (clientErrorStatus !== undefined) {
				const message =
					clientErrorStatus === 413
						? "Request body is too large"
						: "Invalid request";
				res.status(clientErrorStatus).json({ error: message });
				return;
			}

			console.error("Unhandled request error", error);
			res.status(500).json({ error: "Internal server error" });
		},
	);

	return app;
}
