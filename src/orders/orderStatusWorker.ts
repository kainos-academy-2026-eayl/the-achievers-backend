import type { OrderService } from "./orderService";

const POLL_INTERVAL_MS = 10 * 1000;

export function startOrderStatusWorker(
	orderService: Pick<OrderService, "markDueOrdersDelivered">,
	pollIntervalMs = POLL_INTERVAL_MS,
): () => void {
	let isRunning = false;
	const updateDueOrders = async () => {
		if (isRunning) return;
		isRunning = true;
		try {
			await orderService.markDueOrdersDelivered();
		} catch (error) {
			console.error("Failed to update due order statuses", error);
		} finally {
			isRunning = false;
		}
	};

	void updateDueOrders();
	const interval = setInterval(() => void updateDueOrders(), pollIntervalMs);
	interval.unref();
	return () => clearInterval(interval);
}
