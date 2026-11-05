import express, {
	type Express,
	type NextFunction,
	type Request,
	type Response,
} from "express";
import { createRequireAdmin } from "./auth/requireAdmin";
import { createRequireAuth } from "./auth/requireAuth";
import { type CartApiService, createCartRouter } from "./cart/cartController";
import {
	createProductCreationRouter,
	createProductsRouter,
} from "./products/productController";
import {
	createAdminOrdersRouter,
	createOrdersRouter,
	type OrderApiService,
} from "./orders/orderController";
import type { ProductService } from "./products/productService";
import { createProfileRouter } from "./profile/profileController";
import type { ProfileService } from "./profile/profileService";
import { createRateLimiter } from "./rateLimit";
import { createResetPassRouter } from "./resetPass/resetPassController";
import type { ResetPassService } from "./resetPass/resetPassService";
import {
	createReviewsRouter,
	type ReviewApiService,
} from "./reviews/reviewController";
import { createSafeWordHintRouter } from "./safeWordHint/safeWordHintController";
import type { SafeWordHintService } from "./safeWordHint/safeWordHintService";
import { createLoginRouter } from "./userLogin/loginController";
import type { LoginService } from "./userLogin/loginService";
import { createUsersRouter } from "./userRegistration/userController";
import type { UserService } from "./userRegistration/userService";

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
	productService: Pick<ProductService, "getAll" | "getById" | "delete">,
	loginService: Pick<LoginService, "login">,
	cartService: CartApiService,
	jwtSecret: string,
	frontendOrigin = "http://localhost:8000",
	profile?: {
		service: Pick<ProfileService, "getProfile" | "updateProfile">;
		jwtSecret: string;
	},
	adminProducts?: {
		service: Pick<ProductService, "create">;
		jwtSecret: string;
	},
	orders?: {
		service: OrderApiService;
		jwtSecret: string;
	},
	safeWordHintService?: Pick<SafeWordHintService, "getSafeWordHint">,
	resetPassService?: Pick<ResetPassService, "verifySafeWord" | "resetPassword">,
	reviews?: {
		service: ReviewApiService;
		jwtSecret: string;
	},
): Express {
	const app = express();

	app.use((req, res, next) => {
		res.vary("Origin");
		if (req.get("Origin") === frontendOrigin) {
			res.set("Access-Control-Allow-Origin", frontendOrigin);
			if (req.method === "OPTIONS") {
				res.set(
					"Access-Control-Allow-Methods",
					"GET, POST, PUT, PATCH, DELETE, OPTIONS",
				);
				res.set(
					"Access-Control-Allow-Headers",
					"Content-Type, X-Cart-Id, Authorization",
				);
				res.sendStatus(204);
				return;
			}
		}
		next();
	});

	app.use(express.json({ limit: "10kb" }));

	app.get("/health", (_req: Request, res: Response) => {
		res.status(200).json({ status: "UP", time: new Date().toISOString() });
	});

	const usersRouter = createUsersRouter(userService);
	app.use("/api/register", usersRouter);
	app.use(
		"/api/products",
		createProductsRouter(productService, createRequireAdmin(jwtSecret)),
	);
	if (adminProducts) {
		app.use(
			"/api/products",
			createProductCreationRouter(
				adminProducts.service,
				createRequireAdmin(adminProducts.jwtSecret),
			),
		);
	}
	app.use("/api/login", createLoginRouter(loginService));
	app.use("/api/cart", createCartRouter(cartService));
	if (profile) {
		app.use(
			"/api/me",
			createProfileRouter(
				profile.service,
				createRequireAuth(profile.jwtSecret),
			),
		);
	}
	if (orders) {
		app.use(
			"/api/orders",
			createOrdersRouter(orders.service, createRequireAuth(orders.jwtSecret)),
		);
		app.use(
			"/api/admin/orders",
			createAdminOrdersRouter(
				orders.service,
				createRequireAdmin(orders.jwtSecret),
			),
		);
	}
	if (safeWordHintService) {
		// The hint response reveals whether an email has an account.
		app.use(
			"/api/safe-word-hint",
			createRateLimiter({ limit: 5, windowMs: 60_000 }),
			createSafeWordHintRouter(safeWordHintService),
		);
	}
	if (reviews) {
		app.use(
			"/api/reviews",
			createReviewsRouter(
				reviews.service,
				createRequireAuth(reviews.jwtSecret),
			),
		);
	}
	if (resetPassService) {
		// Safe words are guessable, so count attempts per email rather than per IP
		// (every request reaches this API from the frontend server).
		app.use(
			"/api/reset-password",
			createRateLimiter({
				limit: 5,
				windowMs: 15 * 60_000,
				keyFor: (req) => {
					const email = req.body?.email;
					return typeof email === "string"
						? `email:${email.trim().toLowerCase()}`
						: undefined;
				},
			}),
			createResetPassRouter(resetPassService),
		);
	}

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
