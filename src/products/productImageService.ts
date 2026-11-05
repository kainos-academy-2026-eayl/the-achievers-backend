import type { ProductImage } from "../generated/prisma/client";
import type { ProductImageRepository } from "./productImageRepository";
import {
	detectImageType,
	discardStoredImage,
	type ImageStorage,
} from "./productImageStorage";
import type { ProductRepository } from "./productRepository";

export type ProductImageWriteResult =
	| ProductImage
	| "image-not-found"
	| "unsupported-type";

export class ProductImageService {
	constructor(
		private readonly productRepository: Pick<ProductRepository, "findById">,
		private readonly images: ProductImageRepository,
		private readonly storage: ImageStorage,
	) {}

	async add(
		productId: string,
		data: Buffer,
	): Promise<ProductImage | "product-not-found" | "unsupported-type"> {
		if ((await this.productRepository.findById(productId)) === null) {
			return "product-not-found";
		}
		const type = detectImageType(data);
		if (type === null) {
			return "unsupported-type";
		}
		const storageKey = await this.storage.save(data, type);
		try {
			return await this.images.add({
				productId,
				storageKey,
				contentType: type.contentType,
				sizeBytes: data.length,
			});
		} catch (error) {
			await discardStoredImage(this.storage, storageKey);
			throw error;
		}
	}

	async replace(
		productId: string,
		imageId: string,
		data: Buffer,
	): Promise<ProductImageWriteResult> {
		if ((await this.images.findImage(productId, imageId)) === null) {
			return "image-not-found";
		}
		const type = detectImageType(data);
		if (type === null) {
			return "unsupported-type";
		}
		const storageKey = await this.storage.save(data, type);
		let result: Awaited<ReturnType<ProductImageRepository["replace"]>>;
		try {
			result = await this.images.replace(productId, imageId, {
				productId,
				storageKey,
				contentType: type.contentType,
				sizeBytes: data.length,
			});
		} catch (error) {
			await discardStoredImage(this.storage, storageKey);
			throw error;
		}
		if (result === null) {
			await discardStoredImage(this.storage, storageKey);
			return "image-not-found";
		}
		await discardStoredImage(this.storage, result.previousStorageKey);
		return result.image;
	}

	async remove(productId: string, imageId: string): Promise<boolean> {
		const deleted = await this.images.delete(productId, imageId);
		if (deleted === null) {
			return false;
		}
		await discardStoredImage(this.storage, deleted.storageKey);
		return true;
	}

	async read(
		productId: string,
		imageId: string,
	): Promise<{ image: ProductImage; data: Buffer } | null> {
		const image = await this.images.findImage(productId, imageId);
		if (image === null) {
			return null;
		}
		return { image, data: await this.storage.read(image.storageKey) };
	}
}
