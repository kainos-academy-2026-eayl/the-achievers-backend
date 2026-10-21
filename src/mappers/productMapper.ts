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
        // Prisma Decimal serialises to a string in JSON, so send a number instead.
        price: product.price === null ? null : product.price.toNumber(),
        rating: product.rating,
        reviewCount: product.reviewCount,
    };
}
