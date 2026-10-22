import type { Product } from "../generated/prisma/client";

export interface ProductResponseDto {
	id: string;
	name: string;
	description: string | null;
	category: string;
	price: number | null;
	rating: number | null;
	reviewCount: number;
}

export function toProductResponseDto(product: Product): ProductResponseDto {
	return {
		id: product.id,
		name: product.name,
		description: product.description,
		category: product.category,
		price: product.pricePence === null ? null : product.pricePence / 100,
		rating: product.rating,
		reviewCount: product.reviewCount,
	};
}
