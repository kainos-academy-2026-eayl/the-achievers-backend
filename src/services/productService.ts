import type { ProductRepository } from "../repositories/productRepository";

export class ProductService {
    constructor(private readonly productRepository: ProductRepository) { }

    getAll() {
        return this.productRepository.findAll();
    }
}
