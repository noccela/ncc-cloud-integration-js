import * as Types from "../types.js";

const addPrefix = (msg: string) => `NCCWS: ${msg}`;

export const consoleLogger: Types.ConsoleLogger = {

    log: (msg:string) => console.log(addPrefix(msg)),
    warn: (msg:string) => console.warn(addPrefix(msg)),
    error: (msg:string) => console.error(addPrefix(msg)),
    exception: (() => {
        return (msg: string, exception: string) => console.error(addPrefix(msg), exception);
    }),
    debug: (msg: string, ...objs) => console.debug(addPrefix(msg), ...objs)
};
