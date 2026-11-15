import type { RuntimePlugin } from "@fcalell/cli/runtime";
import type { AnyD1Database, DrizzleD1Database } from "drizzle-orm/d1";
import { createClient } from "../d1/client.ts";

export default function dbRuntime<
	TSchema extends Record<string, unknown> = Record<string, unknown>,
>(options: {
	binding: string;
	schema?: TSchema;
}): RuntimePlugin<"db", object, { db: DrizzleD1Database<TSchema> }> {
	// `{}` is the schema-less TSchema, which the default cannot express.
	const schema = (options.schema ?? {}) as TSchema;
	// RuntimePlugin hands the env over as unknown: a Workers env is an object of bindings.
	const binding = (env: unknown): unknown =>
		(env as Record<string, unknown>)[options.binding];
	return {
		name: "db",
		validateEnv(env: unknown) {
			if (!binding(env)) {
				throw new Error(`Missing binding: ${options.binding}`);
			}
		},
		context(env) {
			// validateEnv has checked the binding is present; its type is Cloudflare's.
			return { db: createClient(binding(env) as AnyD1Database, schema) };
		},
	};
}
