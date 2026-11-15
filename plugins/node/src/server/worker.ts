// The worker shape emitted by plugin-api's `.stack/worker.ts` (its
// `WorkerExport`), reduced to what this target calls. On Node, `env` is
// `process.env` and there is no execution context; the worker runtime
// degrades both gracefully.
export interface NodeWorker {
	fetch(
		request: Request,
		env: unknown,
		ctx: unknown,
	): Response | Promise<Response>;
	// The worker's env check (`WorkerExport.checkEnv`): runs before the
	// server listens and throws a message naming every missing var.
	checkEnv?(env: unknown): void;
}
