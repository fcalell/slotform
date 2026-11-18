import {
	dedupeImports,
	type ProviderSpec,
	renderTsSourceFile,
	type TsExpression,
	type TsSourceFile,
} from "@fcalell/cli/ast";
import type { CodegenEntryPayload } from "../types.ts";

// Render `.stack/entry.tsx`. Returns null when no plugin contributes a mount
// — plugin-react contributes the default via react.slots.mountExpression.
export function aggregateEntry(payload: CodegenEntryPayload): string | null {
	if (!payload.mount) return null;

	// The mount is fixed source, not an AST tree — render the imports through
	// the printer (for dedup + canonical ordering) and append it.
	const importsBlock = renderTsSourceFile({
		imports: dedupeImports([...payload.imports, ...payload.mount.imports]),
		statements: [],
	}).trimEnd();
	return `${importsBlock}\n\n${payload.mount.body}\n`;
}

// `.stack/virtual-providers.tsx`: docs/architecture/plugins/react.md, "Providers module".
export function aggregateProviders(providers: ProviderSpec[]): string | null {
	if (providers.length === 0) return null;

	let inner: TsExpression = {
		kind: "member",
		object: { kind: "identifier", name: "props" },
		property: "children",
	};
	for (let i = providers.length - 1; i >= 0; i--) {
		const spec = providers[i];
		if (!spec) continue;
		const children: TsExpression[] =
			spec.siblings && spec.siblings.length > 0
				? [inner, ...spec.siblings]
				: [inner];
		inner = {
			kind: "jsx",
			tag: spec.wrap.identifier,
			props: (spec.wrap.props ?? []).map((p) => ({
				name: p.name,
				value: p.value,
			})),
			children,
		};
	}

	const spec: TsSourceFile = {
		imports: dedupeImports([
			{ source: "react", named: ["ReactNode"], typeOnly: true },
			...providers.flatMap((s) => s.imports),
		]),
		statements: [
			{
				kind: "export-default",
				value: {
					kind: "arrow",
					params: [
						{
							name: "props",
							type: {
								kind: "object",
								members: [
									{
										name: "children",
										type: { kind: "reference", name: "ReactNode" },
									},
								],
							},
						},
					],
					body: inner,
				},
			},
		],
	};

	return renderTsSourceFile(spec);
}
