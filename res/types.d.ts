declare var console: Console;
declare class InternalError extends Error {}

interface Console {
	log(...data: unknown[]): void;
	info(...data: unknown[]): void;
	warn(...data: unknown[]): void;
	error(...data: unknown[]): void;
}
