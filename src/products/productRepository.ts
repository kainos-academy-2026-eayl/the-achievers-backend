import type { CreateProductDto } from "../dtos/createProductDto";
import type { UpdateProductDto } from "../dtos/updateProductDto";
import type {
	PrismaClient,
	Product,
	ProductImage,
} from "../generated/prisma/client";
import { Prisma } from "../generated/prisma/client";

export type ProductWithImages = Product & { images: ProductImage[] };

const includeImages = {
	images: { orderBy: { position: "asc" } },
} as const;

export interface ProductRepository {
	findAll(): Promise<ProductWithImages[]>;
	findById(id: string): Promise<ProductWithImages | null>;
	create(data: CreateProductDto & { id: string }): Promise<ProductWithImages>;
	update(id: string, data: UpdateProductDto): Promise<ProductWithImages | null>;
	delete(id: string): Promise<boolean>;
}

export class PrismaProductRepository implements ProductRepository {
	constructor(private readonly prisma: PrismaClient) {}

	findAll(): Promise<ProductWithImages[]> {
		return this.prisma.product.findMany({
			orderBy: { name: "asc" },
			include: includeImages,
		});
	}

	findById(id: string): Promise<ProductWithImages | null> {
		return this.prisma.product.findUnique({
			where: { id },
			include: includeImages,
		});
	}

	create(data: CreateProductDto & { id: string }): Promise<ProductWithImages> {
		return this.prisma.product.create({ data, include: includeImages });
	}

	async update(
		id: string,
		data: UpdateProductDto,
	): Promise<ProductWithImages | null> {
		try {
			return await this.prisma.product.update({
				where: { id },
				data,
				include: includeImages,
			});
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
