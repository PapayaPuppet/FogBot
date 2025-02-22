
export class DomainInvariantError extends Error {
    public constructor(message?: string, options?: ErrorOptions) {
        super(message, options);
    }
}