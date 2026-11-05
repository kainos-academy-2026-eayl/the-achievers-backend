import { afterEach, describe, expect, it, vi } from "vitest";
import { startOrderStatusWorker } from "../src/orders/orderStatusWorker";

describe("order status worker", () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it("updates immediately and then on each interval until stopped", async () => {
		vi.useFakeTimers();
		const markDueOrdersDelivered = vi.fn().mockResolvedValue(0);
		const stop = startOrderStatusWorker({ markDueOrdersDelivered }, 5_000);

		expect(markDueOrdersDelivered).toHaveBeenCalledTimes(1);
		await vi.advanceTimersByTimeAsync(5_000);
		expect(markDueOrdersDelivered).toHaveBeenCalledTimes(2);

		stop();
		await vi.advanceTimersByTimeAsync(5_000);
		expect(markDueOrdersDelivered).toHaveBeenCalledTimes(2);
	});
});
