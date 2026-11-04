import type { Prisma } from "../generated/prisma/client";

export type CartItemWithProduct = Prisma.CartItemGetPayload<{
	include: { product: true };
}>;
