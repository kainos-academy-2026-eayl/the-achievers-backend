import {
	type ReviewResponseDto,
	type SaveReviewDto,
	toReviewResponseDto,
} from "../dtos/reviewDto";
import { ReviewError } from "../errors/reviewError";
import type { ReviewRepository } from "./reviewRepository";

export class ReviewService {
	constructor(private readonly reviewRepository: ReviewRepository) {}

	async listForUser(userId: number): Promise<ReviewResponseDto[]> {
		const reviews = await this.reviewRepository.findByUser(userId);
		return reviews.map(toReviewResponseDto);
	}

	async saveForUser(
		userId: number,
		productId: string,
		review: SaveReviewDto,
	): Promise<{ review: ReviewResponseDto; created: boolean }> {
		return this.reviewRepository.transaction(async (repository) => {
			const order = await repository.findOrderForUser(review.orderId, userId);
			if (!order) {
				throw new ReviewError("Order not found", 404);
			}
			if (!(await repository.lockProduct(productId))) {
				throw new ReviewError("Product not found", 404);
			}
			if (order.status !== "delivered") {
				throw new ReviewError(
					"Reviews are only available for delivered orders",
					403,
				);
			}
			if (!order.items.some((item) => item.productId === productId)) {
				throw new ReviewError(
					"You can only review products you purchased",
					403,
				);
			}
			const existing = await repository.findForUserAndProduct(
				userId,
				productId,
			);
			const saved = await repository.upsert({
				userId,
				productId,
				orderId: review.orderId,
				rating: review.rating,
				comment: review.comment,
			});
			await repository.recalculateProductRating(productId);
			return { review: toReviewResponseDto(saved), created: !existing };
		});
	}
}
