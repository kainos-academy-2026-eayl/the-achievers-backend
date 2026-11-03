export interface CreateProductDto {
	name: string;
	description: string;
	category: string;
	pricePence: number;
}

export type ProductField = "name" | "description" | "category" | "price";
export type ProductFieldErrors = Partial<Record<ProductField, string>>;

type CreateProductResult =
	| { success: true; data: CreateProductDto }
	| { success: false; message: string; fieldErrors: ProductFieldErrors };

export function parseCreateProductDto(body: unknown): CreateProductResult {
	if (typeof body !== "object" || body === null || Array.isArray(body)) {
		return {
			success: false,
			message: "Request body must be a JSON object",
			fieldErrors: {},
		};
	}

	const fields = body as Record<string, unknown>;
	const fieldErrors: ProductFieldErrors = {};
	const readText = (
		field: "name" | "description" | "category",
		label: string,
		maxLength: number,
	): string => {
		const value = typeof fields[field] === "string" ? fields[field].trim() : "";
		if (!value) {
			fieldErrors[field] = `${label} is required`;
		} else if (value.length > maxLength) {
			fieldErrors[field] =
				`${label} must be no more than ${maxLength} characters`;
		}
		return value;
	};
	const name = readText("name", "Name", 200);
	const description = readText("description", "Description", 2000);
	const category = readText("category", "Category", 100);
	const price =
		typeof fields.price === "number" || typeof fields.price === "string"
			? String(fields.price).trim()
			: "";
	let pricePence = 0;
	if (!/^\d{1,8}(?:\.\d{1,2})?$/.test(price)) {
		fieldErrors.price =
			"Enter a price in pounds with at most two decimal places";
	} else {
		const [pounds = "", pence = ""] = price.split(".");
		pricePence = Number(pounds) * 100 + Number(pence.padEnd(2, "0"));
		if (pricePence > 2147483647) {
			fieldErrors.price = "Price must be between £0.00 and £21,474,836.47";
		}
	}

	if (Object.keys(fieldErrors).length > 0) {
		return { success: false, message: "Validation failed", fieldErrors };
	}
	return {
		success: true,
		data: { name, description, category, pricePence },
	};
}
