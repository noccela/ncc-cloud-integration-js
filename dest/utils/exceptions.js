export class NotImplementedError extends Error {
    constructor() {
        super("Not implemented");
    }
}
export class ArgumentException extends Error {
    constructor(argName) {
        super(`Invalid argument ${argName}`);
    }
}
