export class ReviewError extends Error {
	constructor(
		message: string,
		public readonly status: 400 | 403 | 404,
	) {
		super(message);
		this.name = "ReviewError";
	}
}
