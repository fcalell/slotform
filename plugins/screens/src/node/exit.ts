// Why a child process failed: docs/architecture/plugins/screens.md, "Test run exit".
export function exitFailure(
	label: string,
	code: number | null,
	signal: NodeJS.Signals | null,
): string | null {
	if (code === 0) return null;
	if (code === null) return `${label} was killed by ${signal ?? "a signal"}`;
	return `${label} exited with ${code}`;
}
