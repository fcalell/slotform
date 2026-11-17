import { registerHooks } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { routerSchema } from "../schema.ts";

// The child `stack generate` runs to read the router: docs/architecture/plugins/api.md, "Schema".
// It prints the schema as JSON; a failure prints to stderr and exits 1.
const [cwd] = process.argv.slice(2);
if (cwd === undefined) throw new Error("schema-child: no project directory");

const procedure = pathToFileURL(join(cwd, ".stack/procedure.ts")).href;
registerHooks({
	resolve: (specifier, context, next) =>
		next(
			specifier === "virtual:stack-procedure" ? procedure : specifier,
			context,
		),
});

try {
	const { default: worker } = (await import(
		pathToFileURL(join(cwd, ".stack/worker.ts")).href
	)) as { default: { _router: unknown } };
	process.stdout.write(JSON.stringify(routerSchema(worker._router)));
} catch (error) {
	process.stderr.write(
		error instanceof Error ? (error.stack ?? error.message) : String(error),
	);
	process.exit(1);
}
