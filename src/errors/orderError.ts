export class OrderError extends Error {
    constructor(
        message: string,
        public readonly status: 400 | 404 | 409,
    ) {
        super(message);
        this.name = "OrderError";
    }
}
