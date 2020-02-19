const addPrefix = msg => `NCCWS: ${msg}`;

export const consoleLogger = {
    log: msg => console.log(addPrefix(msg)),
    warn: msg => console.warn(addPrefix(msg)),
    error: msg => console.error(addPrefix(msg)),
    exception: (() => {
        let logFunc = null;
        if (console.exception) {
            logFunc = console.exception;
        } else {
            logFunc = console.error;
        }
        return (msg, exception) => logFunc(addPrefix(msg), exception);
    })(),
    debug: (msg, ...objs) => console.debug(addPrefix(msg), ...objs)
};
