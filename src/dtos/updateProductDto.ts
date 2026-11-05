import {
	type CreateProductDto,
	parseCreateProductDto,
} from "./createProductDto";

export interface UpdateProductDto extends CreateProductDto {
	stock: number;
}

export type ProductUpdateField =
	| "name"
	| "description"
	| "category"
	| "price"
	| "stock";
export type ProductUpdateFieldErrors = Partial<
	Record<ProductUpdateField, string>
>;

type UpdateProductResult =
	| { success: true; data: UpdateProductDto }
	| { success: false; message: string; fieldErrors: ProductUpdateFieldErrors };

export function parseUpdateProductDto(body: unknown): UpdateProductResult {
	const parsed = parseCreateProductDto(body);
	if (typeof body !== "object" || body === null || Array.isArray(body)) {
		return {
			success: false,
			message: "Request body must be a JSON object",
			fieldErrors: {},
		};
	}

	const fieldErrors: ProductUpdateFieldErrors = parsed.success
		? {}
		: { ...parsed.fieldErrors };
	const rawStock: unknown = "stock" in body ? body.stock : undefined;
	const stock =
		typeof rawStock === "number"
			? rawStock
			: typeof rawStock === "string" && /^\d+$/.test(rawStock.trim())
				? Number(rawStock.trim())
				: NaN;
	if (!Number.isInteger(stock) || stock < 0 || stock > 2147483647) {
		fieldErrors.stock =
			"Enter a whole stock quantity between 0 and 2,147,483,647";
	}

	if (!parsed.success || Object.keys(fieldErrors).length > 0) {
		return { success: false, message: "Validation failed", fieldErrors };
	}
	return { success: true, data: { ...parsed.data, stock } };
}
