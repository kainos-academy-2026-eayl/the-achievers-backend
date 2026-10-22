import { Router } from "express";
import { toProductResponseDto } from "../mappers/productMapper";
import type { ProductService } from "../services/productService";

export function createProductsRouter(
	productService: Pick<ProductService, "getAll">,
): Router {
	const router = Router();

	router.get("/", async (_req, res) => {
		const products = await productService.getAll();
		res.status(200).json(products.map(toProductResponseDto));
	});

	return router;
}
