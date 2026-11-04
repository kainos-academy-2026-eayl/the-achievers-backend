import { type RequestHandler, Router } from "express";
import { parseCreateProductDto } from "../dtos/createProductDto";
import { parseUpdateProductDto } from "../dtos/updateProductDto";
import { toProductResponseDto } from "../mappers/productMapper";
import type { ProductService } from "./productService";

export function createProductsRouter(
	productService: Pick<ProductService, "getAll" | "getById">,
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

	return router;
}

export function createProductCreationRouter(
	productService: Pick<ProductService, "create">,
	requireAdmin: RequestHandler,
): Router {
	const router = Router();
	router.post("/", requireAdmin, async (req, res) => {
		res.set("Cache-Control", "no-store");
		const parsed = parseCreateProductDto(req.body);
		if (!parsed.success) {
			res.status(400).json({
				error: parsed.message,
				fieldErrors: parsed.fieldErrors,
			});
			return;
		}
		const product = await productService.create(parsed.data);
		res
			.status(201)
			.location(`/api/products/${encodeURIComponent(product.id)}`)
			.json(toProductResponseDto(product));
	});
	return router;
}

export function createProductUpdateRouter(
	productService: Pick<ProductService, "update" | "getById">,
	requireAdmin: RequestHandler,
): Router {
	const router = Router();
	router.put<{ id: string }>("/:id", requireAdmin, async (req, res) => {
		res.set("Cache-Control", "no-store");
		const parsed = parseUpdateProductDto(req.body);
		if (!parsed.success) {
			res.status(400).json({
				error: parsed.message,
				fieldErrors: parsed.fieldErrors,
			});
			return;
		}
		const existing = await productService.getById(req.params.id);
		if (existing === null) {
			res.status(404).json({ error: "Product not found" });
			return;
		}
		const product = await productService.update(req.params.id, parsed.data);
		if (product === null) {
			res.status(404).json({ error: "Product not found" });
			return;
		}
		res.status(200).json(toProductResponseDto(product));
	});
	return router;
}
