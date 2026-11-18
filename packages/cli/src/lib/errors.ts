import type { ValidationError } from "../config.ts";

export class StackError extends Error {
	readonly code: string;
	constructor(message: string, code: string) {
		super(message);
		this.code = code;
		this.name = "StackError";
	}
}

export class ConfigLoadError extends StackError {
	readonly cause?: unknown;
	constructor(message: string, cause?: unknown) {
		super(message, "CONFIG_LOAD");
		this.cause = cause;
		this.name = "ConfigLoadError";
	}
}

export class ConfigValidationError extends StackError {
	readonly errors: ValidationError[];
	constructor(errors: ValidationError[]) {
		super(
			`Config validation failed with ${errors.length} error(s).`,
			"CONFIG_VALIDATION",
		);
		this.errors = errors;
		this.name = "ConfigValidationError";
	}
}

export class StepFailedError extends StackError {
	constructor(step: string, exitCode: number | null, command: string) {
		super(
			`Step "${step}" (${command}) failed${exitCode !== null ? ` with exit code ${exitCode}` : ""}.`,
			"STEP_FAILED",
		);
		this.name = "StepFailedError";
	}
}

export class MissingPluginError extends StackError {
	constructor(pluginName: string, message?: string) {
		super(
			message ?? `Plugin "${pluginName}" is not available.`,
			"MISSING_PLUGIN",
		);
		this.name = "MissingPluginError";
	}
}
