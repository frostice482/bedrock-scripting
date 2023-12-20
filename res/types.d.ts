declare var __date_clock: () => number
declare var console: Console
declare class InternalError extends Error {}

interface Console {
    log(...data: any[]): void
    info(...data: any[]): void
    warn(...data: any[]): void
    error(...data: any[]): void
}

interface Function {
    get fileName(): string
    get lineNumber(): number
}
