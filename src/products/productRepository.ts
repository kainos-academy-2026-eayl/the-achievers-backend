import type { PrismaClient, Product } from "../generated/prisma/client";

export interface ProductRepository {
	findAll(): Promise<Product[]>;
	findById(id: string): Promise<Product | null>;
	delete(id: string): Promise<boolean>;
}

export class PrismaProductRepository implements ProductRepository {
	constructor(private readonly prisma: PrismaClient) {}

	findAll(): Promise<Product[]> {
		return this.prisma.product.findMany({ orderBy: { name: "asc" } });
	}

	findById(id: string): Promise<Product | null> {
		return this.prisma.product.findUnique({ where: { id } });
	}

	async delete(id: string): Promise<boolean> {
		const { count } = await this.prisma.product.deleteMany({ where: { id } });
		return count > 0;
	}
}
