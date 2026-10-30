export function calculateShippingCostPence(
	subtotalPence: bigint,
	isEmpty: boolean,
): number {
	if (subtotalPence < 0n) {
		throw new RangeError("Subtotal must be non-negative");
	}
	return isEmpty || subtotalPence > 20_000n ? 0 : 499;
}
