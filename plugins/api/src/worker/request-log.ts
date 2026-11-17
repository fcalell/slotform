import type { MiddlewareHandler } from "hono";

// Request log without query strings: docs/architecture/plugins/api.md, "Logging".

function formatDuration(ms: number): string {
	return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(1)}s`;
}

export function pathnameOf(url: string): string {
	const end = url.search(/[?#]/);
	const head = end === -1 ? url : url.slice(0, end);
	const scheme = head.indexOf("://");
	if (scheme === -1) return head;
	const path = head.indexOf("/", scheme + 3);
	return path === -1 ? "/" : head.slice(path);
}

export function formatRequestLog(line: {
	method: string;
	url: string;
	status?: number;
	ms?: number;
}): string {
	const path = pathnameOf(line.url);
	if (line.status === undefined || line.ms === undefined) {
		return `<-- ${line.method} ${path}`;
	}
	return `--> ${line.method} ${path} ${line.status} ${formatDuration(line.ms)}`;
}

// `print` is the test's seam: the worker prints through the console.
export function requestLogger(
	print: (line: string) => void = console.log,
): MiddlewareHandler {
	return async (c, next) => {
		const { method } = c.req;
		const url = c.req.url;
		print(formatRequestLog({ method, url }));
		const start = Date.now();
		await next();
		print(
			formatRequestLog({
				method,
				url,
				status: c.res.status,
				ms: Date.now() - start,
			}),
		);
	};
}
