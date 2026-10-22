import type { PrismaClient, Product } from "../generated/prisma/client";

export interface ProductRepository {
	findAll(): Promise<Product[]>;
}

export class PrismaProductRepository implements ProductRepository {
	constructor(private readonly prisma: PrismaClient) {}

	findAll(): Promise<Product[]> {
		return this.prisma.product.findMany({ orderBy: { name: "asc" } });
	}
}
