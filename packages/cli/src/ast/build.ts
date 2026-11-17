// literalToProps, the one authoring helper: docs/architecture/codegen.md, "The AST and its printers".

import type { TsExpression } from "./specs.ts";

// Value to TsExpression, and what throws: docs/architecture/codegen.md, "The AST and its printers".
function literal(value: unknown): TsExpression {
	if (value === null) return { kind: "null" };
	if (value === undefined) return { kind: "undefined" };
	if (typeof value === "string") return { kind: "string", value };
	if (typeof value === "number") return { kind: "number", value };
	if (typeof value === "boolean") return { kind: "boolean", value };
	if (Array.isArray(value)) {
		return { kind: "array", items: value.map(literal) };
	}
	if (typeof value === "object") {
		const proto = Object.getPrototypeOf(value);
		if (proto !== null && proto !== Object.prototype) {
			const name = value.constructor?.name ?? "object";
			throw new TypeError(
				`literal(): cannot convert non-plain object of type \`${name}\` to a TsExpression. Build a structured TsExpression node instead (e.g. \`{ kind: "new", callee: { kind: "identifier", name: "Date" }, args: [...] }\` for Dates, \`{ kind: "identifier", name }\` for identifiers).`,
			);
		}
		const properties: Array<{ key: string; value: TsExpression }> = [];
		for (const [k, v] of Object.entries(value)) {
			properties.push({ key: k, value: literal(v) });
		}
		return { kind: "object", properties };
	}
	throw new TypeError(
		`literal(): cannot convert value of type \`${typeof value}\` to a TsExpression. Build a structured TsExpression node instead (e.g. \`{ kind: "identifier", name }\` for identifiers, \`{ kind: "string", value }\` for strings).`,
	);
}

// Record of plain values to a key-to-TsExpression map: docs/architecture/codegen.md, "The AST and its printers".
export function literalToProps(
	value: Record<string, unknown>,
): Record<string, TsExpression> {
	const out: Record<string, TsExpression> = {};
	for (const [k, v] of Object.entries(value)) {
		out[k] = literal(v);
	}
	return out;
}
