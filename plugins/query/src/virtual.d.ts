// The module the `vite` and `expo` plugins serve for `.slotform/schema.ts`: each
// procedure's input as JSON Schema, its kind and its scope key, which the
// client reads (`./tanstack-query.tsx`).
declare module "virtual:slotform-schema" {
	import type { ProcedureSchema } from "@slotform/ui-core/form";

	export const SCHEMA: Readonly<Record<string, ProcedureSchema>>;
}
