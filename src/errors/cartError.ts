export class CartError extends Error {
	constructor(
		message: string,
		public readonly status: 400 | 404 | 409,
	) {
		super(message);
		this.name = "CartError";
	}
}
