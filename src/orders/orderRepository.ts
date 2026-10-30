import type { Prisma, PrismaClient } from "../generated/prisma/client";
import type { CartItemWithProduct } from "../model/cartItemWithProduct";

const orderInclude = {
	items: { orderBy: { id: "asc" } },
} as const satisfies Prisma.OrderInclude;

const orderWithCustomerInclude = {
	...orderInclude,
	user: { select: { id: true, email: true, name: true } },
} as const satisfies Prisma.OrderInclude;

export type OrderWithItems = Prisma.OrderGetPayload<{
	include: typeof orderInclude;
}>;

export type OrderWithCustomer = Prisma.OrderGetPayload<{
	include: typeof orderWithCustomerInclude;
}>;

export interface NewOrder {
	id: string;
	reference: string;
	userId: number;
	subtotalPence: number;
	shippingPence: number;
	totalPence: number;
	addressLine1: string;
	addressLine2: string | null;
	city: string;
	postcode: string;
	items: {
		productId: string;
		productName: string;
		unitPricePence: number;
		quantity: number;
	}[];
}

export interface OrderRepository {
	transaction<T>(work: (repository: OrderRepository) => Promise<T>): Promise<T>;
	lockCart(cartId: string): Promise<void>;
	findCartItems(cartId: string): Promise<CartItemWithProduct[]>;
	deductStock(productId: string, quantity: number): Promise<boolean>;
	create(order: NewOrder): Promise<OrderWithItems>;
	clearCart(cartId: string): Promise<void>;
	findByUser(userId: number): Promise<OrderWithItems[]>;
	findByIdForUser(id: string, userId: number): Promise<OrderWithItems | null>;
	findPage(
		skip: number,
		take: number,
	): Promise<{ orders: OrderWithCustomer[]; total: number }>;
	findByIdWithCustomer(id: string): Promise<OrderWithCustomer | null>;
}

export class PrismaOrderRepository implements OrderRepository {
	constructor(
		private readonly prisma: Prisma.TransactionClient | PrismaClient,
	) {}

	transaction<T>(
		work: (repository: OrderRepository) => Promise<T>,
	): Promise<T> {
		return this.prisma.$transaction((transaction) =>
			work(new PrismaOrderRepository(transaction)),
		);
	}

	async lockCart(cartId: string): Promise<void> {
		// Serialises concurrent checkouts of the same cart so stock is only taken once.
		await this.prisma.$queryRaw`
			SELECT 1 FROM "Cart" WHERE "id" = ${cartId}::uuid FOR UPDATE
		`;
	}

	findCartItems(cartId: string): Promise<CartItemWithProduct[]> {
		return this.prisma.cartItem.findMany({
			where: { cartId },
			include: { product: true },
			orderBy: { productId: "asc" },
		});
	}

	async deductStock(productId: string, quantity: number): Promise<boolean> {
		const result = await this.prisma.product.updateMany({
			where: { id: productId, stock: { gte: quantity } },
			data: { stock: { decrement: quantity } },
		});
		return result.count > 0;
	}

	create({ items, ...order }: NewOrder): Promise<OrderWithItems> {
		return this.prisma.order.create({
			data: { ...order, items: { create: items } },
			include: orderInclude,
		});
	}

	async clearCart(cartId: string): Promise<void> {
		await this.prisma.cartItem.deleteMany({ where: { cartId } });
	}

	findByUser(userId: number): Promise<OrderWithItems[]> {
		return this.prisma.order.findMany({
			where: { userId },
			include: orderInclude,
			orderBy: { createdAt: "desc" },
		});
	}

	findByIdForUser(id: string, userId: number): Promise<OrderWithItems | null> {
		return this.prisma.order.findFirst({
			where: { id, userId },
			include: orderInclude,
		});
	}

	async findPage(skip: number, take: number) {
		const [orders, total] = await Promise.all([
			this.prisma.order.findMany({
				include: orderWithCustomerInclude,
				orderBy: [{ createdAt: "desc" }, { id: "asc" }],
				skip,
				take,
			}),
			this.prisma.order.count(),
		]);
		return { orders, total };
	}

	findByIdWithCustomer(id: string): Promise<OrderWithCustomer | null> {
		return this.prisma.order.findUnique({
			where: { id },
			include: orderWithCustomerInclude,
		});
	}
}
