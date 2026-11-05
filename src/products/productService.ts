import { randomUUID } from "node:crypto";
import type { CreateProductDto } from "../dtos/createProductDto";
import type { UpdateProductDto } from "../dtos/updateProductDto";
import type { ImageStorage } from "./productImageStorage";
import { discardStoredImage } from "./productImageStorage";
import type { ProductRepository } from "./productRepository";

export class ProductService {
	constructor(
		private readonly productRepository: ProductRepository,
		private readonly imageStorage?: Pick<ImageStorage, "remove">,
	) {}

	getAll() {
		return this.productRepository.findAll();
	}

	getById(id: string) {
		return this.productRepository.findById(id);
	}

	create(data: CreateProductDto) {
		return this.productRepository.create({ ...data, id: randomUUID() });
	}
	update(id: string, data: UpdateProductDto) {
		return this.productRepository.update(id, data);
	}

	async delete(id: string) {
		const storage = this.imageStorage;
		if (!storage) {
			return this.productRepository.delete(id);
		}
		const product = await this.productRepository.findById(id);
		if (product === null) {
			return false;
		}
		const deleted = await this.productRepository.delete(id);
		if (deleted) {
			await Promise.all(
				product.images.map((image) =>
					discardStoredImage(storage, image.storageKey),
				),
			);
		}
		return deleted;
	}
}
