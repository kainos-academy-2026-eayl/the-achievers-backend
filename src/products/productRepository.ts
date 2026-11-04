import type { CreateProductDto } from "../dtos/createProductDto";
import type { UpdateProductDto } from "../dtos/updateProductDto";
import type { PrismaClient, Product } from "../generated/prisma/client";
import { Prisma } from "../generated/prisma/client";

export interface ProductRepository {
	findAll(): Promise<Product[]>;
	findById(id: string): Promise<Product | null>;
	create(data: CreateProductDto & { id: string }): Promise<Product>;
	update(id: string, data: UpdateProductDto): Promise<Product | null>;
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

	create(data: CreateProductDto & { id: string }): Promise<Product> {
		return this.prisma.product.create({ data });
	}

	async update(id: string, data: UpdateProductDto): Promise<Product | null> {
		try {
			return await this.prisma.product.update({ where: { id }, data });
		} catch (error) {
			if (
				error instanceof Prisma.PrismaClientKnownRequestError &&
				error.code === "P2025"
			) {
				return null;
			}
			throw error;
		}
	}

	async delete(id: string): Promise<boolean> {
		const { count } = await this.prisma.product.deleteMany({ where: { id } });
		return count > 0;
	}
}
