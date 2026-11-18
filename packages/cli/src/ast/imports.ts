import type { TsImportSpec } from "./specs.ts";

// Import merge: docs/architecture/codegen.md, "Import merge".
export function dedupeImports(specs: TsImportSpec[]): TsImportSpec[] {
	interface Accum {
		source: string;
		// `null` until a default contribution lands; every one after must agree.
		defaultTypeOnly: boolean | null;
		// Keyed by local name: docs/architecture/codegen.md, "Import merge". A
		// binding any contribution imports as a value is a value.
		namedByLocal: Map<
			string,
			{ imported: string; alias: string | null; typeOnly: boolean }
		>;
		// Plain default imports: `import D from "foo"`. At most one distinct `D`
		// per source — same string from N contributors collapses, different
		// strings throw.
		defaultName: string | null;
		// Plain namespace imports: `import * as NS from "foo"`. Tracked per
		// source. Cross-source uniqueness of `NS` is enforced after grouping
		// (same alias against different sources throws).
		namespaces: Set<string>;
		sideEffect: boolean;
	}

	const groups = new Map<string, Accum>();
	for (const spec of specs) {
		const accum: Accum = groups.get(spec.source) ?? {
			source: spec.source,
			defaultTypeOnly: null,
			namedByLocal: new Map(),
			defaultName: null,
			namespaces: new Set(),
			sideEffect: false,
		};
		if (!groups.has(spec.source)) groups.set(spec.source, accum);

		if ("sideEffect" in spec) {
			accum.sideEffect = true;
			continue;
		}
		if ("default" in spec) {
			if (accum.defaultName !== null && accum.defaultName !== spec.default) {
				throw new Error(
					`dedupeImports: conflicting default imports for "${spec.source}" — ` +
						`"${accum.defaultName}" vs "${spec.default}". A module can be ` +
						`bound to only one local name in a single file; reconcile the ` +
						`contributing plugins.`,
				);
			}
			accum.defaultName = spec.default;
			accum.defaultTypeOnly = reconcileTypeOnly(
				accum.defaultTypeOnly,
				spec.typeOnly,
				`conflicting \`typeOnly\` for the default import of "${spec.source}" ` +
					`("${spec.default}") — every contributor must agree.`,
			);
			continue;
		}
		if ("namespace" in spec) {
			accum.namespaces.add(spec.namespace);
			continue;
		}
		// Named bindings.
		for (const n of spec.named) {
			const imported = typeof n === "string" ? n : n.name;
			const local = typeof n === "string" ? n : n.alias;
			const alias = typeof n === "string" ? null : n.alias;
			const existing = accum.namedByLocal.get(local);
			if (existing && existing.imported !== imported) {
				throw new Error(
					`dedupeImports: conflicting named imports for "${spec.source}" — ` +
						`local name "${local}" bound to both "${existing.imported}" and ` +
						`"${imported}". Either rename one alias or reconcile contributors.`,
				);
			}
			const typeOnly = spec.typeOnly === true && (existing?.typeOnly ?? true);
			accum.namedByLocal.set(local, { imported, alias, typeOnly });
		}
	}

	// Cross-source check: namespace alias uniqueness. `import * as NS from "a"`
	// and `import * as NS from "b"` would shadow each other in the emitted file.
	const namespaceOwners = new Map<string, string>();
	for (const g of groups.values()) {
		for (const ns of g.namespaces) {
			const prior = namespaceOwners.get(ns);
			if (prior && prior !== g.source) {
				throw new Error(
					`dedupeImports: namespace alias "${ns}" is bound to both ` +
						`"${prior}" and "${g.source}". Pick a different alias on one of ` +
						`the contributing plugins.`,
				);
			}
			namespaceOwners.set(ns, g.source);
		}
	}

	const out: TsImportSpec[] = [];
	for (const g of groups.values()) {
		if (g.sideEffect) {
			out.push({ source: g.source, sideEffect: true });
		}
		if (g.defaultName !== null) {
			out.push({
				source: g.source,
				default: g.defaultName,
				...(g.defaultTypeOnly ? { typeOnly: true } : {}),
			});
		}
		for (const ns of g.namespaces) {
			out.push({ source: g.source, namespace: ns });
		}
		// One line of values, then one of types.
		for (const typeOnly of [false, true]) {
			const named = Array.from(g.namedByLocal.values())
				.filter((b) => b.typeOnly === typeOnly)
				.map(({ imported, alias }) =>
					alias === null ? imported : { name: imported, alias },
				);
			if (named.length === 0) continue;
			out.push({
				source: g.source,
				named,
				...(typeOnly ? { typeOnly: true } : {}),
			});
		}
	}
	return out;
}

function reconcileTypeOnly(
	current: boolean | null,
	incoming: boolean | undefined,
	message: string,
): boolean {
	const inc = incoming ?? false;
	if (current === null) return inc;
	if (current !== inc) throw new Error(`dedupeImports: ${message}`);
	return current;
}
