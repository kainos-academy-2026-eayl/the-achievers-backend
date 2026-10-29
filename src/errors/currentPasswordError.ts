export class CurrentPasswordError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "CurrentPasswordError";
	}
}
