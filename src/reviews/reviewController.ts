import {
	type NextFunction,
	type Request,
	type RequestHandler,
	type Response,
	Router,
} from "express";
import { parseProductId, parseSaveReviewDto } from "../dtos/reviewDto";
import { ReviewError } from "../errors/reviewError";
import type { ReviewService } from "./reviewService";

export type ReviewApiService = Pick<
	ReviewService,
	"listForUser" | "saveForUser"
>;

function noStore(_req: Request, res: Response, next: NextFunction) {
	res.set("Cache-Control", "no-store");
	next();
}

function handleReviewErrors(
	error: unknown,
	_req: Request,
	res: Response,
	next: NextFunction,
) {
	if (error instanceof ReviewError) {
		res.status(error.status).json({ error: error.message });
		return;
	}
	next(error);
}

export function createReviewsRouter(
	reviewService: ReviewApiService,
	requireAuth: RequestHandler,
): Router {
	const router = Router();
	router.use(noStore, requireAuth);

	router.get("/me", async (_req, res) => {
		res.json(await reviewService.listForUser(res.locals.userId));
	});

	router.put("/:productId", async (req, res) => {
		const productId = parseProductId(req.params.productId);
		const dto = parseSaveReviewDto(req.body);
		const { review, created } = await reviewService.saveForUser(
			res.locals.userId,
			productId,
			dto,
		);
		res.status(created ? 201 : 200).json(review);
	});

	router.use(handleReviewErrors);
	return router;
}
