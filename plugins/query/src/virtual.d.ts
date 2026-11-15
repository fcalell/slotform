// The module `plugin-vite` and `plugin-expo` serve for `.stack/schema.ts`: each
// procedure's input as JSON Schema, its kind and its scope key, which the
// client reads (`./tanstack-query.tsx`).
declare module "virtual:stack-schema" {
	import type { ProcedureSchema } from "@fcalell/ui-core/form";

	export const SCHEMA: Readonly<Record<string, ProcedureSchema>>;
}
