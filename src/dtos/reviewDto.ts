import { ReviewError } from "../errors/reviewError";
import type {
	ProductReviewRecord,
	ReviewRecord,
} from "../reviews/reviewRepository";

export const MAX_REVIEW_COMMENT_LENGTH = 1000;
const MAX_PRODUCT_ID_LENGTH = 200;
const UUID_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface SaveReviewDto {
	orderId: string;
	rating: number;
	comment: string | null;
}

export interface ReviewResponseDto {
	id: number;
	productId: string;
	orderId: string;
	rating: number;
	comment: string | null;
	createdAt: Date;
	updatedAt: Date;
}

export interface ProductReviewResponseDto {
	productId: string;
	rating: number;
	comment: string | null;
	firstName: string;
	createdAt: Date;
}

export function parseProductId(value: string): string {
	const productId = value.trim();
	if (!productId || productId.length > MAX_PRODUCT_ID_LENGTH) {
		throw new ReviewError("Product not found", 404);
	}
	return productId;
}

export function parseSaveReviewDto(body: unknown): SaveReviewDto {
	if (typeof body !== "object" || body === null || Array.isArray(body)) {
		throw new ReviewError("Request body must be a JSON object", 400);
	}
	const { orderId, rating, comment } = body as Record<string, unknown>;
	if (typeof orderId !== "string" || !UUID_PATTERN.test(orderId)) {
		throw new ReviewError("orderId must be a valid order id", 400);
	}
	if (
		typeof rating !== "number" ||
		!Number.isInteger(rating) ||
		rating < 1 ||
		rating > 5
	) {
		throw new ReviewError("rating must be a whole number from 1 to 5", 400);
	}
	if (
		comment !== undefined &&
		comment !== null &&
		typeof comment !== "string"
	) {
		throw new ReviewError("comment must be text", 400);
	}
	const trimmed = typeof comment === "string" ? comment.trim() : "";
	if (trimmed.length > MAX_REVIEW_COMMENT_LENGTH) {
		throw new ReviewError(
			`comment must be ${MAX_REVIEW_COMMENT_LENGTH} characters or fewer`,
			400,
		);
	}
	return {
		orderId: orderId.toLowerCase(),
		rating,
		comment: trimmed || null,
	};
}

export function toReviewResponseDto(review: ReviewRecord): ReviewResponseDto {
	return {
		id: review.id,
		productId: review.productId,
		orderId: review.orderId,
		rating: review.rating,
		comment: review.comment,
		createdAt: review.createdAt,
		updatedAt: review.updatedAt,
	};
}

export function toProductReviewResponseDto(
	review: ProductReviewRecord,
): ProductReviewResponseDto {
	return {
		productId: review.productId,
		rating: review.rating,
		comment: review.comment,
		firstName: review.user.name.trim().split(/\s+/)[0] || "Customer",
		createdAt: review.createdAt,
	};
}
