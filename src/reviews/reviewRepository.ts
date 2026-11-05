import type { PrismaClient, Prisma } from "../generated/prisma/client";

export type ReviewRecord = Prisma.ReviewGetPayload<object>;
export type ProductReviewRecord = Prisma.ReviewGetPayload<{
	include: { user: { select: { name: true } } };
}>;

export interface ReviewableOrder {
	status: string;
	createdAt: Date;
	items: { productId: string | null }[];
}

export interface ReviewRepository {
	transaction<T>(
		work: (repository: ReviewRepository) => Promise<T>,
	): Promise<T>;
	findByUser(userId: number): Promise<ReviewRecord[]>;
	findByProduct(productId: string): Promise<ProductReviewRecord[]>;
	findOrderForUser(
		orderId: string,
		userId: number,
	): Promise<ReviewableOrder | null>;
	lockProduct(productId: string): Promise<boolean>;
	findForUserAndProduct(
		userId: number,
		productId: string,
	): Promise<ReviewRecord | null>;
	upsert(review: {
		userId: number;
		productId: string;
		orderId: string;
		rating: number;
		comment: string | null;
	}): Promise<ReviewRecord>;
	recalculateProductRating(productId: string): Promise<void>;
}

export class PrismaReviewRepository implements ReviewRepository {
	constructor(
		private readonly prisma: Prisma.TransactionClient | PrismaClient,
	) {}

	transaction<T>(
		work: (repository: ReviewRepository) => Promise<T>,
	): Promise<T> {
		if (!("$transaction" in this.prisma)) {
			return work(this);
		}
		return this.prisma.$transaction((transaction) =>
			work(new PrismaReviewRepository(transaction)),
		);
	}

	findByUser(userId: number): Promise<ReviewRecord[]> {
		return this.prisma.review.findMany({
			where: { userId },
			orderBy: { updatedAt: "desc" },
		});
	}

	findByProduct(productId: string): Promise<ProductReviewRecord[]> {
		return this.prisma.review.findMany({
			where: { productId },
			orderBy: { createdAt: "desc" },
			include: { user: { select: { name: true } } },
		});
	}

	findOrderForUser(
		orderId: string,
		userId: number,
	): Promise<ReviewableOrder | null> {
		return this.prisma.order.findFirst({
			where: { id: orderId, userId },
			select: {
				status: true,
				createdAt: true,
				items: { select: { productId: true } },
			},
		});
	}

	async lockProduct(productId: string): Promise<boolean> {
		// Serialises rating recalculation so concurrent reviews can't overwrite each other's totals.
		const rows = await this.prisma.$queryRaw<unknown[]>`
			SELECT 1 FROM "Product" WHERE "id" = ${productId} FOR UPDATE
		`;
		return rows.length > 0;
	}

	findForUserAndProduct(
		userId: number,
		productId: string,
	): Promise<ReviewRecord | null> {
		return this.prisma.review.findUnique({
			where: { userId_productId: { userId, productId } },
		});
	}

	upsert({
		userId,
		productId,
		orderId,
		rating,
		comment,
	}: {
		userId: number;
		productId: string;
		orderId: string;
		rating: number;
		comment: string | null;
	}): Promise<ReviewRecord> {
		return this.prisma.review.upsert({
			where: { userId_productId: { userId, productId } },
			create: { userId, productId, orderId, rating, comment },
			update: { orderId, rating, comment },
		});
	}

	async recalculateProductRating(productId: string): Promise<void> {
		const { _sum, _count } = await this.prisma.review.aggregate({
			where: { productId },
			_sum: { rating: true },
			_count: { _all: true },
		});
		const count = _count._all;
		const totalStars = _sum.rating ?? 0;
		await this.prisma.product.update({
			where: { id: productId },
			data: {
				reviewCount: count,
				rating: count === 0 ? null : Math.round((totalStars / count) * 10) / 10,
			},
		});
	}
}
