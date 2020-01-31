export class NotImplementedError extends Error {
    constructor(...args) {
        super("Not implemented", ...args);
    }
}

export class ArgumentException extends Error {
    constructor(argName, ...args) {
        super(`Invalid argument ${argName}`, ...args);
    }
}
