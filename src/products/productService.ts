import type { ProductRepository } from "./productRepository";

export class ProductService {
	constructor(private readonly productRepository: ProductRepository) {}

	getAll() {
		return this.productRepository.findAll();
	}

	getById(id: string) {
		return this.productRepository.findById(id);
	}
}
