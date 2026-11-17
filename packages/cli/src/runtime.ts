// The RuntimePlugin protocol every worker runtime implements: docs/architecture/runtime.md, "Runtime plugin protocol".

export interface RuntimePlugin<
	TName extends string = string,
	TDeps = object,
	TProvides = object,
	TRoutes extends Record<string, unknown> = Record<never, never>,
> {
	name: TName;
	// `dependsOn`: docs/architecture/runtime.md, "Runtime plugin protocol".
	dependsOn?: readonly string[];
	validateEnv?(env: unknown): void;
	context(env: unknown, upstream: TDeps): TProvides | Promise<TProvides>;
	routes?(procedure: unknown): TRoutes;
	// `fetch` claims a request: docs/architecture/runtime.md, "Request order".
	fetch?(
		request: Request,
		env: unknown,
		upstream: TDeps & TProvides,
	): Response | null | undefined | Promise<Response | null | undefined>;
}
