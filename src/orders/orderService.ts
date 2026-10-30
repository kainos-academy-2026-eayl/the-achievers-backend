import { randomBytes, randomUUID } from "node:crypto";
import type { AddressDto } from "../dtos/updateProfileDto";
import { OrderError } from "../errors/orderError";
import {
    toAdminOrderResponseDto,
    toOrderResponseDto,
} from "../mappers/orderMapper";
import { calculateShippingCostPence } from "../shipping";
import type { OrderRepository } from "./orderRepository";

const MAX_DB_INT = 2_147_483_647n;
const REFERENCE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateReference(): string {
    // 32-symbol alphabet, so masking each byte to 5 bits is unbiased.
    const chars = Array.from(
        randomBytes(8),
        (byte) => REFERENCE_ALPHABET[byte & 31],
    );
    return `ORD-${chars.join("")}`;
}

export class OrderService {
    constructor(private readonly orderRepository: OrderRepository) { }

    async checkout(userId: number, cartId: string, address: AddressDto) {
        const order = await this.orderRepository.transaction(async (repository) => {
            await repository.lockCart(cartId);
            const items = await repository.findCartItems(cartId);
            if (items.length === 0) {
                throw new OrderError("Cart is empty", 400);
            }

            let subtotalPence = 0n;
            for (const { product, quantity } of items) {
                if (product.pricePence === null || product.pricePence < 0) {
                    throw new OrderError(`${product.name} is not available to buy`, 409);
                }
                subtotalPence += BigInt(product.pricePence) * BigInt(quantity);
            }
            const shippingPence = calculateShippingCostPence(subtotalPence, false);
            const totalPence = subtotalPence + BigInt(shippingPence);
            if (totalPence > MAX_DB_INT) {
                throw new OrderError("Order total is too large", 409);
            }

            for (const { product, quantity } of items) {
                if (!(await repository.deductStock(product.id, quantity))) {
                    throw new OrderError(`Not enough stock for ${product.name}`, 409);
                }
            }

            if (!(await repository.deductCredit(userId, Number(totalPence)))) {
                throw new OrderError("Not enough account credit", 409);
            }

            const created = await repository.create({
                id: randomUUID(),
                reference: generateReference(),
                userId,
                subtotalPence: Number(subtotalPence),
                shippingPence,
                totalPence: Number(totalPence),
                addressLine1: address.addressLine1,
                addressLine2: address.addressLine2,
                city: address.city,
                postcode: address.postcode,
                items: items.map(({ product, quantity }) => ({
                    productId: product.id,
                    productName: product.name,
                    unitPricePence: product.pricePence as number,
                    quantity,
                })),
            });
            await repository.clearCart(cartId);
            return created;
        });
        return toOrderResponseDto(order);
    }

    async listForUser(userId: number) {
        const orders = await this.orderRepository.findByUser(userId);
        return orders.map(toOrderResponseDto);
    }

    async getForUser(id: string, userId: number) {
        const order = await this.orderRepository.findByIdForUser(id, userId);
        if (!order) {
            throw new OrderError("Order not found", 404);
        }
        return toOrderResponseDto(order);
    }

    async listAll(page: number, pageSize: number) {
        const { orders, total } = await this.orderRepository.findPage(
            (page - 1) * pageSize,
            pageSize,
        );
        return {
            orders: orders.map(toAdminOrderResponseDto),
            page,
            pageSize,
            total,
        };
    }

    async getById(id: string) {
        const order = await this.orderRepository.findByIdWithCustomer(id);
        if (!order) {
            throw new OrderError("Order not found", 404);
        }
        return toAdminOrderResponseDto(order);
    }
}
