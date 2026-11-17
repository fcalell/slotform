// The worker shape this target calls: docs/architecture/plugins/node.md, "Worker contract".
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
