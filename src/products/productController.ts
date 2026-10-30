import { type RequestHandler, Router } from "express";
import { toProductResponseDto } from "../mappers/productMapper";
import type { ProductService } from "./productService";

export function createProductsRouter(
	productService: Pick<ProductService, "getAll" | "getById" | "delete">,
	requireAdmin: RequestHandler,
): Router {
	const router = Router();

	router.get("/", async (_req, res) => {
		const products = await productService.getAll();
		res.status(200).json(products.map(toProductResponseDto));
	});

	router.get("/:id", async (req, res) => {
		const product = await productService.getById(req.params.id);
		if (product === null) {
			res.status(404).json({ error: "Product not found" });
			return;
		}
		res.status(200).json(toProductResponseDto(product));
	});

	router.delete<{ id: string }>("/:id", requireAdmin, async (req, res) => {
		const deleted = await productService.delete(req.params.id);
		if (!deleted) {
			res.status(404).json({ error: "Product not found" });
			return;
		}
		res.status(204).end();
	});

	return router;
}
