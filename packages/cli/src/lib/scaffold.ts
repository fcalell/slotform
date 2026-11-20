import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { log } from "@clack/prompts";
import type { ScaffoldSpec } from "../ast/index.ts";
import { gitignoreTemplate } from "../templates/gitignore.ts";
import { SlotformError } from "./errors.ts";
import { insideProject } from "./inside-project.ts";
import { isRecord } from "./is-record.ts";

class ScaffoldError extends SlotformError {
	constructor(message: string) {
		super(message, "SCAFFOLD");
		this.name = "ScaffoldError";
	}
}

// For the CLI's base files only, never plugin content: docs/architecture/plugin-authoring.md, "Templates".
export function writeIfMissingString(path: string, content: string): boolean {
	if (existsSync(path)) {
		log.info(`${path} already exists, skipping`);
		return false;
	}
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, content);
	return true;
}

export async function writeScaffoldSpecs(
	specs: ScaffoldSpec[],
	cwd: string,
): Promise<string[]> {
	// Every target is checked before any write: docs/architecture/plugin-authoring.md, "Templates".
	const seen = new Map<string, string>();
	for (const spec of specs) {
		const prior = seen.get(spec.target);
		if (prior !== undefined) {
			throw new ScaffoldError(
				`Duplicate scaffold target "${spec.target}" contributed by plugin-${prior} and plugin-${spec.plugin}`,
			);
		}
		seen.set(spec.target, spec.plugin);
	}
	const writes = specs.map((spec) => ({
		spec,
		absTarget: insideProject(cwd, spec.target),
	}));

	const created: string[] = [];
	for (const { spec, absTarget } of writes) {
		if (existsSync(absTarget)) continue;

		const content = spec.source
			? await readFile(spec.source, "utf8")
			: spec.content;
		await mkdir(dirname(absTarget), { recursive: true });
		await writeFile(absTarget, content);
		created.push(spec.target);
	}
	return created;
}

export function announceCreated(created: readonly string[]): void {
	if (created.length > 0) {
		log.success(`Created: ${created.join(", ")}`);
	}
}

// Adds the entries `dir/.gitignore` lacks as whole lines, starting a missing
// file from the template.
export function ensureGitignore(dir: string, ...entries: string[]): void {
	const path = join(dir, ".gitignore");
	const existing = existsSync(path) ? readFileSync(path, "utf-8") : null;
	const content = existing ?? gitignoreTemplate();
	const lines = new Set(content.split("\n").map((line) => line.trim()));
	const missing = entries.filter((e) => !lines.has(e));
	if (existing !== null && missing.length === 0) return;
	const added = missing.length > 0 ? `\n${missing.join("\n")}\n` : "";
	writeFileSync(path, `${content}${added}`);
}

interface PackageJsonPatch {
	imports?: Record<string, string>;
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
	scripts?: Record<string, string>;
	// Arbitrary top-level fields (e.g. Expo's `main`). Written only when the key
	// is absent, so a consumer-customized value is never overwritten.
	fields?: Record<string, unknown>;
}

const DEPENDENCY_FIELDS: readonly string[] = [
	"dependencies",
	"devDependencies",
];

export function patchPackageJson(cwd: string, patch: PackageJsonPatch): void {
	const pkgPath = join(cwd, "package.json");
	if (!existsSync(pkgPath)) {
		log.warn("No package.json found — skipping dependency setup.");
		return;
	}

	const pkg: unknown = JSON.parse(readFileSync(pkgPath, "utf-8"));
	if (!isRecord(pkg)) {
		throw new ScaffoldError(`${pkgPath} is not a JSON object.`);
	}
	let changed = false;
	const entries = (field: string): Record<string, unknown> => {
		const value = pkg[field];
		return isRecord(value) ? value : {};
	};
	// A package either dependency field declares is present in both, so no
	// name is declared twice.
	const present = (field: string, name: string) =>
		DEPENDENCY_FIELDS.includes(field)
			? DEPENDENCY_FIELDS.some((f) => name in entries(f))
			: name in entries(field);

	for (const field of [
		"imports",
		"dependencies",
		"devDependencies",
		"scripts",
	] as const) {
		const additions = patch[field];
		if (!additions) continue;
		const existing = entries(field);
		const missing = Object.entries(additions).filter(
			([k]) => !present(field, k),
		);
		if (missing.length > 0) {
			const merged = [...Object.entries(existing), ...missing];
			// Dependency maps stay sorted by name, as the template writes them.
			if (DEPENDENCY_FIELDS.includes(field)) {
				merged.sort(([a], [b]) => a.localeCompare(b));
			}
			pkg[field] = Object.fromEntries(merged);
			changed = true;
		}
	}

	if (patch.fields) {
		for (const [key, value] of Object.entries(patch.fields)) {
			if (key in pkg) continue;
			pkg[key] = value;
			changed = true;
		}
	}

	if (changed) {
		writeFileSync(pkgPath, `${JSON.stringify(pkg, null, "\t")}\n`);
	}
}
