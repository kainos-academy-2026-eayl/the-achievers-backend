import { randomUUID } from "node:crypto";
import type { CreateProductDto } from "../dtos/createProductDto";
import type { UpdateProductDto } from "../dtos/updateProductDto";
import type { ProductRepository } from "./productRepository";

export class ProductService {
	constructor(private readonly productRepository: ProductRepository) {}

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

	delete(id: string) {
		return this.productRepository.delete(id);
	}
}
