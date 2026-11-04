export class InvalidSafeWordError extends Error {
	constructor() {
		super("Invalid email or safe word");
		this.name = "InvalidSafeWordError";
	}
}
