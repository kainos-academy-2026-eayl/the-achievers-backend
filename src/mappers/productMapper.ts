import type { ProductImage } from "../generated/prisma/client";
import type { ProductWithImages } from "../products/productRepository";

export interface ProductImageResponseDto {
	id: string;
	url: string;
	contentType: string;
}

export interface ProductResponseDto {
	id: string;
	name: string;
	description: string | null;
	category: string;
	price: number | null;
	rating: number | null;
	reviewCount: number;
	stock: number;
	inStock: boolean;
	images: ProductImageResponseDto[];
}

export function toProductImageResponseDto(
	productId: string,
	image: ProductImage,
): ProductImageResponseDto {
	return {
		id: image.id,
		url: `/api/products/${encodeURIComponent(productId)}/images/${encodeURIComponent(image.id)}`,
		contentType: image.contentType,
	};
}

export function toProductResponseDto(
	product: ProductWithImages,
): ProductResponseDto {
	return {
		id: product.id,
		name: product.name,
		description: product.description,
		category: product.category,
		price: product.pricePence === null ? null : product.pricePence / 100,
		rating: product.rating,
		reviewCount: product.reviewCount,
		stock: product.stock,
		inStock: product.stock > 0,
		images: product.images.map((image) =>
			toProductImageResponseDto(product.id, image),
		),
	};
}
