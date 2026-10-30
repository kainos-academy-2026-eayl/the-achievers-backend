import {
    type NextFunction,
    type Request,
    type RequestHandler,
    type Response,
    Router,
} from "express";
import { parseCartId } from "../dtos/cartDto";
import {
    parseCheckoutDto,
    parseOrderId,
    parsePagination,
} from "../dtos/orderDto";
import { CartError } from "../errors/cartError";
import { OrderError } from "../errors/orderError";
import type { OrderService } from "./orderService";

export type OrderApiService = Pick<
    OrderService,
    "checkout" | "listForUser" | "getForUser" | "listAll" | "getById"
>;

function noStore(_req: Request, res: Response, next: NextFunction) {
    res.set("Cache-Control", "no-store");
    next();
}

function handleOrderErrors(
    error: unknown,
    _req: Request,
    res: Response,
    next: NextFunction,
) {
    if (error instanceof OrderError || error instanceof CartError) {
        res.status(error.status).json({ error: error.message });
        return;
    }
    next(error);
}

export function createOrdersRouter(
    orderService: OrderApiService,
    requireAuth: RequestHandler,
): Router {
    const router = Router();
    router.use(noStore, requireAuth);

    router.post("/", async (req, res) => {
        const cartId = parseCartId(req.get("X-Cart-Id"));
        const parsed = parseCheckoutDto(req.body);
        if (!parsed.success) {
            res
                .status(400)
                .json({ error: parsed.message, fieldErrors: parsed.fieldErrors });
            return;
        }
        const order = await orderService.checkout(
            res.locals.userId,
            cartId,
            parsed.data.shippingAddress,
        );
        res.status(201).json(order);
    });

    router.get("/", async (_req, res) => {
        res.json(await orderService.listForUser(res.locals.userId));
    });

    router.get("/:id", async (req, res) => {
        res.json(
            await orderService.getForUser(
                parseOrderId(req.params.id),
                res.locals.userId,
            ),
        );
    });

    router.use(handleOrderErrors);
    return router;
}

export function createAdminOrdersRouter(
    orderService: OrderApiService,
    requireAdmin: RequestHandler,
): Router {
    const router = Router();
    router.use(noStore, requireAdmin);

    router.get("/", async (req, res) => {
        const { page, pageSize } = parsePagination(req.query);
        res.json(await orderService.listAll(page, pageSize));
    });

    router.get("/:id", async (req, res) => {
        res.json(await orderService.getById(parseOrderId(req.params.id)));
    });

    router.use(handleOrderErrors);
    return router;
}
