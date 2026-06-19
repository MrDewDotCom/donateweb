export class SlipOkVerificationException extends Error {
    constructor(
        public readonly code: number,
        message: string,
        public readonly raw?: unknown,
    ) {
        super(message);
    }
}