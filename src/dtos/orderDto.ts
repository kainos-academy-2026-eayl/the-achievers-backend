import { OrderError } from "../errors/orderError";
import {
    type AddressDto,
    type FieldErrors,
    parseAddress,
} from "./updateProfileDto";

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
const MAX_PAGE = 1_000_000;

export type CheckoutDtoResult =
    | { success: true; data: { shippingAddress: AddressDto; }; }
    | { success: false; message: string; fieldErrors: FieldErrors; };

export function parseCheckoutDto(body: unknown): CheckoutDtoResult {
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
        return {
            success: false,
            message: "Request body must be a JSON object",
            fieldErrors: {},
        };
    }

    const errors: FieldErrors = {};
    const shippingAddress = parseAddress(
        (body as Record<string, unknown>).shippingAddress,
        "shippingAddress",
        false,
        errors,
    );
    if (!shippingAddress) {
        errors.shippingAddress ??= "Enter a shipping address";
    }
    if (!shippingAddress || Object.keys(errors).length > 0) {
        return {
            success: false,
            message: "Validation failed",
            fieldErrors: errors,
        };
    }
    return { success: true, data: { shippingAddress } };
}

function parsePositiveInt(
    value: unknown,
    fallback: number,
    max: number,
    name: string,
): number {
    if (value === undefined) return fallback;
    if (typeof value !== "string" || !/^\d{1,7}$/.test(value)) {
        throw new OrderError(`${name} must be a whole number`, 400);
    }
    const parsed = Number(value);
    if (parsed < 1 || parsed > max) {
        throw new OrderError(`${name} must be between 1 and ${max}`, 400);
    }
    return parsed;
}

export function parsePagination(query: Record<string, unknown>) {
    return {
        page: parsePositiveInt(query.page, 1, MAX_PAGE, "page"),
        pageSize: parsePositiveInt(
            query.pageSize,
            DEFAULT_PAGE_SIZE,
            MAX_PAGE_SIZE,
            "pageSize",
        ),
    };
}

export function parseOrderId(value: string): string {
    if (
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            value,
        )
    ) {
        throw new OrderError("Order not found", 404);
    }
    return value.toLowerCase();
}
