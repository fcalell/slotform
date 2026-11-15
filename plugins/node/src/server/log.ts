export interface ServiceLogger {
	info(message: string): void;
	error(message: string): void;
}
