import type { PrismaClient, ProductImage } from "../generated/prisma/client";

export interface NewProductImage {
	productId: string;
	storageKey: string;
	contentType: string;
	sizeBytes: number;
}

export interface ProductImageRepository {
	findImage(productId: string, imageId: string): Promise<ProductImage | null>;
	add(data: NewProductImage): Promise<ProductImage>;
	replace(
		productId: string,
		imageId: string,
		data: NewProductImage,
	): Promise<{ image: ProductImage; previousStorageKey: string } | null>;
	delete(productId: string, imageId: string): Promise<ProductImage | null>;
}

export class PrismaProductImageRepository implements ProductImageRepository {
	constructor(private readonly prisma: PrismaClient) {}

	findImage(productId: string, imageId: string): Promise<ProductImage | null> {
		return this.prisma.productImage.findFirst({
			where: { id: imageId, productId },
		});
	}

	async add(data: NewProductImage): Promise<ProductImage> {
		const { _max } = await this.prisma.productImage.aggregate({
			where: { productId: data.productId },
			_max: { position: true },
		});
		return this.prisma.productImage.create({
			data: { ...data, position: (_max.position ?? -1) + 1 },
		});
	}

	replace(
		productId: string,
		imageId: string,
		data: NewProductImage,
	): Promise<{ image: ProductImage; previousStorageKey: string } | null> {
		return this.prisma.$transaction(async (tx) => {
			const existing = await tx.productImage.findFirst({
				where: { id: imageId, productId },
			});
			if (existing === null) {
				return null;
			}
			await tx.productImage.delete({ where: { id: existing.id } });
			const image = await tx.productImage.create({
				data: { ...data, position: existing.position },
			});
			return { image, previousStorageKey: existing.storageKey };
		});
	}

	delete(productId: string, imageId: string): Promise<ProductImage | null> {
		return this.prisma.$transaction(async (tx) => {
			const existing = await tx.productImage.findFirst({
				where: { id: imageId, productId },
			});
			if (existing === null) {
				return null;
			}
			await tx.productImage.delete({ where: { id: existing.id } });
			return existing;
		});
	}
}
