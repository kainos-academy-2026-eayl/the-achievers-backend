import type { CreateProductDto } from "../dtos/createProductDto";
import type { PrismaClient, Product } from "../generated/prisma/client";

export interface ProductRepository {
	findAll(): Promise<Product[]>;
	findById(id: string): Promise<Product | null>;
	create(data: CreateProductDto & { id: string }): Promise<Product>;
}

export class PrismaProductRepository implements ProductRepository {
	constructor(private readonly prisma: PrismaClient) {}

	findAll(): Promise<Product[]> {
		return this.prisma.product.findMany({ orderBy: { name: "asc" } });
	}

	findById(id: string): Promise<Product | null> {
		return this.prisma.product.findUnique({ where: { id } });
	}

	create(data: CreateProductDto & { id: string }): Promise<Product> {
		return this.prisma.product.create({ data });
	}
}
