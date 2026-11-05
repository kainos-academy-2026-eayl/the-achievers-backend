import { type RequestHandler, Router } from "express";
import multer, { MulterError } from "multer";
import { toProductImageResponseDto } from "../mappers/productMapper";
import type { ProductImageService } from "./productImageService";
import { MAX_IMAGE_BYTES } from "./productImageStorage";

const singleImageUpload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: MAX_IMAGE_BYTES, files: 1, fields: 0 },
}).single("image");

type UploadResult =
	| { ok: true; data: Buffer }
	| { ok: false; status: 400 | 413; body: Record<string, unknown> };

function readUpload(
	req: Parameters<typeof singleImageUpload>[0],
	res: Parameters<typeof singleImageUpload>[1],
): Promise<UploadResult> {
	return new Promise((resolve) => {
		singleImageUpload(req, res, (error: unknown) => {
			if (error instanceof MulterError) {
				if (error.code === "LIMIT_FILE_SIZE") {
					resolve({
						ok: false,
						status: 413,
						body: { error: "Image is too large" },
					});
					return;
				}
				resolve({
					ok: false,
					status: 400,
					body: {
						error: "Invalid image upload",
						fieldErrors: {
							image: "Upload a single image in the 'image' field",
						},
					},
				});
				return;
			}
			if (error) {
				resolve({
					ok: false,
					status: 400,
					body: { error: "Invalid image upload" },
				});
				return;
			}
			if (!req.file) {
				resolve({
					ok: false,
					status: 400,
					body: {
						error: "Invalid image upload",
						fieldErrors: { image: "An image file is required" },
					},
				});
				return;
			}
			resolve({ ok: true, data: req.file.buffer });
		});
	});
}

const UNSUPPORTED_TYPE_BODY = {
	error: "Invalid image upload",
	fieldErrors: { image: "Only JPEG, PNG and WebP images are supported" },
};

export function createProductImagesRouter(
	imageService: Pick<
		ProductImageService,
		"add" | "replace" | "remove" | "read"
	>,
	requireAdmin: RequestHandler,
): Router {
	const router = Router();

	router.post<{ id: string }>("/:id/images", requireAdmin, async (req, res) => {
		res.set("Cache-Control", "no-store");
		const upload = await readUpload(req, res);
		if (!upload.ok) {
			res.status(upload.status).json(upload.body);
			return;
		}
		const image = await imageService.add(req.params.id, upload.data);
		if (image === "product-not-found") {
			res.status(404).json({ error: "Product not found" });
			return;
		}
		if (image === "unsupported-type") {
			res.status(400).json(UNSUPPORTED_TYPE_BODY);
			return;
		}
		const response = toProductImageResponseDto(req.params.id, image);
		res.status(201).location(response.url).json(response);
	});

	router.put<{ id: string; imageId: string }>(
		"/:id/images/:imageId",
		requireAdmin,
		async (req, res) => {
			res.set("Cache-Control", "no-store");
			const upload = await readUpload(req, res);
			if (!upload.ok) {
				res.status(upload.status).json(upload.body);
				return;
			}
			const image = await imageService.replace(
				req.params.id,
				req.params.imageId,
				upload.data,
			);
			if (image === "image-not-found") {
				res.status(404).json({ error: "Image not found" });
				return;
			}
			if (image === "unsupported-type") {
				res.status(400).json(UNSUPPORTED_TYPE_BODY);
				return;
			}
			res.status(200).json(toProductImageResponseDto(req.params.id, image));
		},
	);

	router.delete<{ id: string; imageId: string }>(
		"/:id/images/:imageId",
		requireAdmin,
		async (req, res) => {
			res.set("Cache-Control", "no-store");
			const removed = await imageService.remove(
				req.params.id,
				req.params.imageId,
			);
			if (!removed) {
				res.status(404).json({ error: "Image not found" });
				return;
			}
			res.status(204).end();
		},
	);

	router.get<{ id: string; imageId: string }>(
		"/:id/images/:imageId",
		async (req, res) => {
			const found = await imageService.read(req.params.id, req.params.imageId);
			if (found === null) {
				res.status(404).json({ error: "Image not found" });
				return;
			}
			res.set({
				"Content-Type": found.image.contentType,
				"Content-Length": String(found.data.length),
				"Cache-Control": "public, max-age=31536000, immutable",
				"X-Content-Type-Options": "nosniff",
			});
			res.status(200).end(found.data);
		},
	);

	return router;
}
