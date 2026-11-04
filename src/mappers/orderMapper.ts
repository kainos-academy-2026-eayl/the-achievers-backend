import type {
	OrderWithCustomer,
	OrderWithItems,
} from "../orders/orderRepository";

export interface OrderResponseDto {
	id: string;
	reference: string;
	status: string;
	items: {
		productId: string | null;
		name: string;
		price: number;
		quantity: number;
	}[];
	subtotal: number;
	shipping: number;
	total: number;
	shippingAddress: {
		addressLine1: string;
		addressLine2: string | null;
		city: string;
		postcode: string;
	};
	createdAt: Date;
}

export interface AdminOrderResponseDto extends OrderResponseDto {
	customer: { id: number; email: string; name: string };
}

const DELIVERY_TIME_MS = 7 * 24 * 60 * 60 * 1000;

export function displayStatus(
	order: Pick<OrderWithItems, "status" | "createdAt">,
): string {
	const isDue = Date.now() - order.createdAt.getTime() >= DELIVERY_TIME_MS;
	return order.status === "placed" && isDue ? "delivered" : order.status;
}

export function toOrderResponseDto(order: OrderWithItems): OrderResponseDto {
	return {
		id: order.id,
		reference: order.reference,
		status: displayStatus(order),
		items: order.items.map((item) => ({
			productId: item.productId,
			name: item.productName,
			price: item.unitPricePence / 100,
			quantity: item.quantity,
		})),
		subtotal: order.subtotalPence / 100,
		shipping: order.shippingPence / 100,
		total: order.totalPence / 100,
		shippingAddress: {
			addressLine1: order.addressLine1,
			addressLine2: order.addressLine2,
			city: order.city,
			postcode: order.postcode,
		},
		createdAt: order.createdAt,
	};
}

export function toAdminOrderResponseDto(
	order: OrderWithCustomer,
): AdminOrderResponseDto {
	return { ...toOrderResponseDto(order), customer: order.user };
}
