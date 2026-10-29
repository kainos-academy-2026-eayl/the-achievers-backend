import {
	type NextFunction,
	type Request,
	type Response,
	Router,
} from "express";
import {
	parseAddCartItemDto,
	parseCartId,
	parseUpdateCartItemDto,
} from "../dtos/cartDto";
import { CartError } from "../errors/cartError";
import type { CartService } from "./cartService";

export type CartApiService = Pick<
	CartService,
	"get" | "add" | "setQuantity" | "remove"
>;

export function createCartRouter(cartService: CartApiService): Router {
	const router = Router();

	router.use((req, _res, next) => {
		parseCartId(req.get("X-Cart-Id"));
		next();
	});

	router.get("/", async (req, res) => {
		res
			.status(200)
			.json(await cartService.get(parseCartId(req.get("X-Cart-Id"))));
	});

	router.post("/items", async (req, res) => {
		const { productId, quantity } = parseAddCartItemDto(req.body);
		const cart = await cartService.add(
			parseCartId(req.get("X-Cart-Id")),
			productId,
			quantity,
		);
		res.status(200).json(cart);
	});

	router.patch("/items/:productId", async (req, res) => {
		const { quantity } = parseUpdateCartItemDto(req.body);
		const cart = await cartService.setQuantity(
			parseCartId(req.get("X-Cart-Id")),
			req.params.productId,
			quantity,
		);
		res.status(200).json(cart);
	});

	router.delete("/items/:productId", async (req, res) => {
		const cart = await cartService.remove(
			parseCartId(req.get("X-Cart-Id")),
			req.params.productId,
		);
		res.status(200).json(cart);
	});

	router.use(
		(error: unknown, _req: Request, res: Response, next: NextFunction) => {
			if (error instanceof CartError) {
				res.status(error.status).json({ error: error.message });
				return;
			}
			next(error);
		},
	);

	return router;
}
