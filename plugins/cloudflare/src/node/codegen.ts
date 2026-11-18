import { isAbsolute, posix } from "node:path";
import type { ContributionCtx } from "@fcalell/cli";
import {
	renderToml,
	type TomlDocument,
	type TomlValue,
} from "@fcalell/cli/ast";
import { parse as parseToml } from "smol-toml";
import type { CodegenWranglerPayload, WranglerBindingSpec } from "../types.ts";

// ── Wrangler.toml merge contract ─────────────────────────────────────
// The merge contract, key by key: docs/architecture/plugins/cloudflare.md, "wrangler.toml merge contract".

const FRAMEWORK_MANAGED = new Set<string>([
	"d1_databases",
	"kv_namespaces",
	"analytics_engine_datasets",
	"unsafe", // [unsafe.bindings] — rate_limiter
	"compatibility_flags",
	"assets",
]);

const CONSUMER_MERGED_LISTS = new Set<string>([
	"routes",
	"r2_buckets",
	"queues",
]);

const GENERATED_MAIN_VALUES = new Set([
	"worker.ts",
	"./worker.ts",
	".stack/worker.ts",
	"./.stack/worker.ts",
]);

// YYYY-MM-DD — wrangler accepts only this exact form. Reject anything else
// at generate time so `wrangler types` doesn't fail later with a less obvious
// message.
const COMPATIBILITY_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Wrangler rejects names that aren't lowercase alphanumeric with dashes. Consumer
// app names (from `stack init`'s basename) can include dots, underscores, or
// uppercase — normalize so `wrangler types` succeeds on the generated toml.
export function sanitizeWranglerName(name: string): string {
	const slug = name
		.toLowerCase()
		.replace(/[^a-z0-9-]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.replace(/-{2,}/g, "-");
	return slug || "stack-app";
}

export function aggregateWrangler(opts: {
	consumerWrangler: string | null;
	payload: CodegenWranglerPayload;
	name?: string;
	log: Pick<ContributionCtx["log"], "warn">;
}): string {
	if (!COMPATIBILITY_DATE_RE.test(opts.payload.compatibilityDate)) {
		throw new Error(
			`Invalid compatibility_date "${opts.payload.compatibilityDate}": must be YYYY-MM-DD.`,
		);
	}

	const consumerParsed = parseConsumerWrangler(opts.consumerWrangler);
	rejectFrameworkManagedSections(consumerParsed);
	const consumerR2 = extractConsumerR2(consumerParsed);
	const consumerRoutes = extractConsumerRoutes(consumerParsed);
	const consumerQueues = extractConsumerQueues(consumerParsed);
	assertTriggersMatchHandler(consumerParsed, opts.payload.scheduledHandler);
	assertQueueConsumersMatchHandler(consumerQueues, opts.payload.queueHandler);

	// One namespace check before any TOML renders: docs/architecture/plugins/cloudflare.md, "Env namespace".
	assertNoNamespaceCollisions(
		opts.payload,
		consumerR2.map((e) => String(e.binding)),
		consumerQueues.producers.map((e) => String(e.binding)),
	);
	assertNoConsumerQueueCollisions(opts.payload, consumerQueues);

	const root: Record<string, TomlValue> = {};
	const arrayTables: Array<{
		path: string[];
		entries: Record<string, TomlValue>;
	}> = [];

	// Every other consumer key passes through, `[vars]` too: the var bindings
	// overlay it below.
	for (const [k, v] of Object.entries(consumerParsed)) {
		if (FRAMEWORK_MANAGED.has(k)) continue;
		if (CONSUMER_MERGED_LISTS.has(k)) continue;
		root[k] = v;
	}

	// The framework-defaulted scalars the consumer did not set.
	const fallbackName = sanitizeWranglerName(opts.name ?? "stack-app");
	if (root.name === undefined) {
		root.name = fallbackName;
	} else if (typeof root.name !== "string") {
		throw new Error(
			`Invalid wrangler.toml: \`name\` must be a string (got ${typeof root.name}).`,
		);
	}
	if (root.compatibility_date === undefined) {
		root.compatibility_date = opts.payload.compatibilityDate;
	} else if (typeof root.compatibility_date !== "string") {
		throw new Error(
			`Invalid wrangler.toml: \`compatibility_date\` must be a string (got ${typeof root.compatibility_date}).`,
		);
	} else if (!COMPATIBILITY_DATE_RE.test(root.compatibility_date)) {
		throw new Error(
			`Invalid wrangler.toml: \`compatibility_date\` must be YYYY-MM-DD (got "${root.compatibility_date}").`,
		);
	}
	if (root.main === undefined) {
		root.main = "worker.ts";
	} else if (
		typeof root.main === "string" &&
		!GENERATED_MAIN_VALUES.has(root.main)
	) {
		opts.log.warn(
			`Custom \`main\` detected in wrangler.toml (${root.main}); stack will not override it. Ensure it re-exports from .stack/worker.ts, or remove the line to let stack manage it.`,
		);
	}
	if (opts.payload.serve) root.main = opts.payload.serve.main;

	// The framework-managed sections, which the consumer's file cannot hold
	// (`rejectFrameworkManagedSections`). `compatibility_flags` is a flat
	// array, deduped and sorted, omitted when nothing was contributed.
	if (opts.payload.compatibilityFlags.length > 0) {
		root.compatibility_flags = [
			...new Set(opts.payload.compatibilityFlags),
		].sort();
	}

	// The web client's build, served for every path the worker does not own.
	const assetsDir = assetsDirectory(opts.payload);
	if (assetsDir !== null) {
		// Each prefix bare and with `/*`: `/mcp/*` alone misses `/mcp`, which
		// the web client's fallback would answer.
		const runWorkerFirst = [
			...new Set(
				[
					...opts.payload.routePrefixes,
					...(opts.payload.serve ? ["/fixture"] : []),
				].flatMap((prefix) => [prefix, `${prefix}/*`]),
			),
		].sort();
		root.assets = {
			directory: assetsDir,
			not_found_handling: "single-page-application",
			...(runWorkerFirst.length > 0 && { run_worker_first: runWorkerFirst }),
		};
	}

	appendBindingsToTables(opts.payload.bindings, arrayTables, String(root.name));

	// Consumer r2 entries render after the framework's, verbatim (extra keys
	// like `jurisdiction` survive). Binding-name collisions were caught by
	// the namespace check above.
	for (const entry of consumerR2) {
		arrayTables.push({ path: ["r2_buckets"], entries: entry });
	}

	// Consumer queue tables render after the plugin's, verbatim.
	for (const entry of consumerQueues.producers) {
		arrayTables.push({ path: ["queues", "producers"], entries: entry });
	}
	for (const entry of consumerQueues.consumers) {
		arrayTables.push({ path: ["queues", "consumers"], entries: entry });
	}

	const routePatterns = new Set<string>();
	for (const entry of consumerRoutes) {
		const pattern = String(entry.pattern);
		if (routePatterns.has(pattern)) {
			throw new Error(
				`Duplicate wrangler route pattern "${pattern}" in wrangler.toml. Remove one.`,
			);
		}
		routePatterns.add(pattern);
		arrayTables.push({ path: ["routes"], entries: entry });
	}

	overlayVars(root, opts.payload);

	const doc: TomlDocument = { root, arrayTables };
	return renderToml(doc);
}

// `[assets] directory`, which resolves against `.stack/`, where the config
// lands; a serve run names its own copy of the client build.
function assetsDirectory(payload: CodegenWranglerPayload): string | null {
	if (payload.serve) return payload.serve.clientDir;
	if (payload.clientDir === null) return null;
	return posix.join("..", posix.normalize(payload.clientDir));
}

function parseConsumerWrangler(
	source: string | null,
): Record<string, TomlValue> {
	if (!source) return {};
	try {
		// smol-toml types a table's values as unknown; every value it parses is a TomlValue.
		return parseToml(source) as Record<string, TomlValue>;
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		throw new Error(`Failed to parse consumer wrangler.toml: ${msg}`);
	}
}

function rejectFrameworkManagedSections(
	parsed: Record<string, TomlValue>,
): void {
	const offenders: string[] = [];
	for (const key of FRAMEWORK_MANAGED) {
		if (parsed[key] !== undefined) {
			// `unsafe` is the parent of `[unsafe.bindings]`. Only flag it when the
			// nested `bindings` array is actually present — leaving room for other
			// `[unsafe.*]` sections wrangler may add later that we don't manage.
			if (key === "unsafe") {
				const u = parsed.unsafe;
				if (
					typeof u === "object" &&
					u !== null &&
					!Array.isArray(u) &&
					Array.isArray(u.bindings)
				) {
					offenders.push("unsafe.bindings");
				}
				continue;
			}
			offenders.push(key);
		}
	}
	if (offenders.length === 0) return;
	throw new Error(
		`wrangler.toml contains framework-managed section(s): ${offenders
			.map((s) => `\`${s}\``)
			.join(
				", ",
			)}. Remove them: stack generates them from the plugins in stack.config.ts (bindings from db/auth/..., \`[assets]\` from vite's client build).`,
	);
}

function extractConsumerR2(
	parsed: Record<string, TomlValue>,
): Array<Record<string, TomlValue>> {
	const raw = parsed.r2_buckets;
	if (raw === undefined) return [];
	if (!Array.isArray(raw)) {
		throw new Error(
			"Invalid wrangler.toml: `r2_buckets` must be an array of tables ([[r2_buckets]]).",
		);
	}
	return raw.map((e) => {
		if (typeof e !== "object" || e === null || Array.isArray(e)) {
			throw new Error(
				"Invalid [[r2_buckets]] entry in wrangler.toml: each entry must be a table.",
			);
		}
		for (const key of ["binding", "bucket_name"] as const) {
			if (typeof e[key] !== "string" || e[key].length === 0) {
				throw new Error(
					`Invalid [[r2_buckets]] entry in wrangler.toml: \`${key}\` is required and must be a non-empty string.`,
				);
			}
		}
		return e;
	});
}

function extractConsumerRoutes(
	parsed: Record<string, TomlValue>,
): Array<Record<string, TomlValue>> {
	const raw = parsed.routes;
	if (raw === undefined) return [];
	if (!Array.isArray(raw)) {
		throw new Error(
			"Invalid wrangler.toml: `routes` must be an array ([[routes]] tables or route-pattern strings).",
		);
	}
	return raw.map((e) => {
		// wrangler's `routes = ["example.com/*"]` shorthand.
		if (typeof e === "string") {
			if (e.length === 0) {
				throw new Error(
					"Invalid routes entry in wrangler.toml: a route pattern must be non-empty.",
				);
			}
			return { pattern: e };
		}
		if (typeof e !== "object" || e === null || Array.isArray(e)) {
			throw new Error(
				"Invalid [[routes]] entry in wrangler.toml: each entry must be a table or a pattern string.",
			);
		}
		if (typeof e.pattern !== "string" || e.pattern.length === 0) {
			throw new Error(
				"Invalid [[routes]] entry in wrangler.toml: `pattern` is required and must be a non-empty string.",
			);
		}
		return e;
	});
}

type ConsumerQueues = {
	producers: Array<Record<string, TomlValue>>;
	consumers: Array<Record<string, TomlValue>>;
};

function extractConsumerQueues(
	parsed: Record<string, TomlValue>,
): ConsumerQueues {
	const raw = parsed.queues;
	const empty: ConsumerQueues = { producers: [], consumers: [] };
	if (raw === undefined) return empty;
	if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
		throw new Error(
			"Invalid wrangler.toml: `queues` must be a table holding [[queues.producers]] and [[queues.consumers]].",
		);
	}
	const { producers, consumers, ...rest } = raw;
	if (Object.keys(rest).length > 0) {
		throw new Error(
			`Invalid wrangler.toml: \`queues\` holds only producers and consumers (got ${Object.keys(rest).join(", ")}).`,
		);
	}
	const list = (
		value: TomlValue | undefined,
		section: string,
		required: string,
	): Array<Record<string, TomlValue>> => {
		if (value === undefined) return [];
		if (!Array.isArray(value)) {
			throw new Error(
				`Invalid wrangler.toml: \`queues.${section}\` must be an array of tables ([[queues.${section}]]).`,
			);
		}
		return value.map((e) => {
			if (typeof e !== "object" || e === null || Array.isArray(e)) {
				throw new Error(
					`Invalid [[queues.${section}]] entry in wrangler.toml: each entry must be a table.`,
				);
			}
			if (typeof e[required] !== "string" || e[required].length === 0) {
				throw new Error(
					`Invalid [[queues.${section}]] entry in wrangler.toml: \`${required}\` is required and must be a non-empty string.`,
				);
			}
			return e;
		});
	};
	return {
		producers: list(producers, "producers", "binding"),
		consumers: list(consumers, "consumers", "queue"),
	};
}

// crons and the scheduled handler come together: docs/architecture/plugins/cloudflare.md, "wrangler.toml merge contract".
function assertTriggersMatchHandler(
	parsed: Record<string, TomlValue>,
	hasHandler: boolean,
): void {
	const raw = parsed.triggers;
	let crons: TomlValue[] = [];
	if (raw !== undefined) {
		if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
			throw new Error("Invalid wrangler.toml: `triggers` must be a table.");
		}
		const value = raw.crons;
		if (value !== undefined) {
			if (!Array.isArray(value) || value.some((c) => typeof c !== "string")) {
				throw new Error(
					"Invalid wrangler.toml: `triggers.crons` must be an array of cron expression strings.",
				);
			}
			crons = value;
		}
	}
	if (crons.length > 0 && !hasHandler) {
		throw new Error(
			"wrangler.toml [triggers] crons needs src/worker/scheduled.ts: a cron needs src/worker/scheduled.ts (default-export defineScheduled(...)), or remove the crons.",
		);
	}
	if (crons.length === 0 && hasHandler) {
		throw new Error(
			"src/worker/scheduled.ts runs on no cron: add [triggers] crons to the root wrangler.toml, or remove the file.",
		);
	}
}

function assertQueueConsumersMatchHandler(
	queues: ConsumerQueues,
	hasHandler: boolean,
): void {
	if (queues.consumers.length > 0 && !hasHandler) {
		throw new Error(
			"wrangler.toml [[queues.consumers]]: a queue consumer needs src/worker/queue.ts (default-export defineQueue(...)), or remove the consumer.",
		);
	}
}

// A queue the plugin consumes cannot be consumed again by the root file: one
// queue has one consumer.
function assertNoConsumerQueueCollisions(
	payload: CodegenWranglerPayload,
	queues: ConsumerQueues,
): void {
	const own = new Set(
		payload.bindings.flatMap((b) =>
			b.kind === "queue" && b.consumer ? [b.queue] : [],
		),
	);
	const clash = queues.consumers
		.map((c) => String(c.queue))
		.filter((q) => own.has(q));
	if (clash.length > 0) {
		throw new Error(
			`Duplicate wrangler queue consumer(s): ${clash
				.map((q) => `"${q}"`)
				.join(
					", ",
				)} (plugin contribution vs consumer wrangler.toml). A queue has one consumer: remove the [[queues.consumers]] entry.`,
		);
	}
}

// `[vars]`: the consumer's keys and the var bindings, each key from one source.
function overlayVars(
	root: Record<string, TomlValue>,
	payload: CodegenWranglerPayload,
): void {
	const raw = root.vars ?? {};
	if (typeof raw !== "object" || Array.isArray(raw)) {
		throw new Error("Invalid wrangler.toml: `vars` must be a table.");
	}
	const varBindings = payload.bindings.filter(
		(b): b is Extract<WranglerBindingSpec, { kind: "var" }> => b.kind === "var",
	);
	const collisions = [
		...varBindings.map((v) => ({ key: v.name, framework: "var binding" })),
		...payload.secrets.map((s) => ({ key: s.name, framework: "secret" })),
	].filter((c) => c.key in raw);
	if (collisions.length > 0) {
		const lines = collisions.map(
			(c) => `  - "${c.key}" (consumer wrangler.toml [vars] vs ${c.framework})`,
		);
		throw new Error(
			`wrangler.toml [vars] collisions — each key must come from one source:\n${lines.join(
				"\n",
			)}\nRemove the consumer-side entry or rename the contributor.`,
		);
	}
	if (varBindings.length === 0) return;
	root.vars = {
		...raw,
		...Object.fromEntries(varBindings.map((v) => [v.name, v.value])),
	};
}

// ── Namespace collision detection ────────────────────────────────────
// Every env identifier shares one flat namespace: docs/architecture/plugins/cloudflare.md, "Env namespace".

type NamespaceKind =
	| "d1 binding"
	| "kv namespace"
	| "r2 bucket"
	| "r2 bucket (consumer wrangler.toml)"
	| "queue producer"
	| "queue producer (consumer wrangler.toml)"
	| "analytics_engine dataset"
	| "rate_limiter binding"
	| "var"
	| "secret";

interface NamespaceEntry {
	kind: NamespaceKind;
}

function kindFor(binding: WranglerBindingSpec): NamespaceKind {
	switch (binding.kind) {
		case "d1":
			return "d1 binding";
		case "kv":
			return "kv namespace";
		case "r2":
			return "r2 bucket";
		case "analytics_engine":
			return "analytics_engine dataset";
		case "rate_limiter":
			return "rate_limiter binding";
		case "queue":
			return "queue producer";
		case "var":
			return "var";
	}
}

function idFor(binding: WranglerBindingSpec): string {
	return binding.kind === "var" ? binding.name : binding.binding;
}

function assertNoNamespaceCollisions(
	payload: CodegenWranglerPayload,
	consumerR2Bindings: string[],
	consumerQueueBindings: string[],
): void {
	const seen = new Map<string, NamespaceEntry[]>();

	const push = (id: string, entry: NamespaceEntry) => {
		const bucket = seen.get(id);
		if (bucket) bucket.push(entry);
		else seen.set(id, [entry]);
	};

	for (const b of payload.bindings) push(idFor(b), { kind: kindFor(b) });
	for (const b of consumerR2Bindings)
		push(b, { kind: "r2 bucket (consumer wrangler.toml)" });
	for (const b of consumerQueueBindings)
		push(b, { kind: "queue producer (consumer wrangler.toml)" });
	for (const s of payload.secrets) push(s.name, { kind: "secret" });

	const conflicts: Array<{ id: string; entries: NamespaceEntry[] }> = [];
	for (const [id, entries] of seen) {
		if (entries.length > 1) conflicts.push({ id, entries });
	}
	if (conflicts.length === 0) return;

	const lines = conflicts.map(({ id, entries }) => {
		const shapes = entries.map((e) => e.kind).join(", ");
		return `  - "${id}" (registered as ${shapes})`;
	});
	throw new Error(
		`Duplicate wrangler identifier(s) — each name must be unique across bindings, vars, and secrets:\n${lines.join(
			"\n",
		)}\nRename one side (plugin identifier or consumer wrangler.toml entry).`,
	);
}

// Rate-limit namespace ids: docs/architecture/plugins/cloudflare.md, "Rate limiters".
function rateLimitNamespaceId(workerName: string, binding: string): string {
	const input = `${workerName}/${binding}`;
	let hash = 0x811c9dc5;
	for (let i = 0; i < input.length; i++) {
		hash ^= input.charCodeAt(i);
		hash = Math.imul(hash, 0x01000193);
	}
	return String((hash >>> 0) % 2147483646 || 1);
}

function appendBindingsToTables(
	rawBindings: WranglerBindingSpec[],
	arrayTables: Array<{ path: string[]; entries: Record<string, TomlValue> }>,
	workerName: string,
): void {
	// Canonical order: docs/architecture/plugins/cloudflare.md, "wrangler.toml determinism".
	const bindings = [...rawBindings].sort((a, b) =>
		idFor(a).localeCompare(idFor(b)),
	);
	for (const b of bindings) {
		if (b.kind !== "d1") continue;
		const entry: Record<string, TomlValue> = {
			binding: b.binding,
			database_id: b.databaseId,
			database_name: b.databaseName,
		};
		// `migrationsDir` on the spec is consumer-root-relative; wrangler
		// resolves `migrations_dir` against the config file's directory, and
		// this aggregator emits the config to `.stack/wrangler.toml`.
		if (b.migrationsDir) {
			entry.migrations_dir = isAbsolute(b.migrationsDir)
				? b.migrationsDir
				: posix.join("..", posix.normalize(b.migrationsDir));
		}
		arrayTables.push({ path: ["d1_databases"], entries: entry });
	}

	for (const b of bindings) {
		if (b.kind !== "kv") continue;
		arrayTables.push({
			path: ["kv_namespaces"],
			entries: { binding: b.binding, id: b.id },
		});
	}

	for (const b of bindings) {
		if (b.kind !== "r2") continue;
		arrayTables.push({
			path: ["r2_buckets"],
			entries: { binding: b.binding, bucket_name: b.bucketName },
		});
	}

	for (const b of bindings) {
		if (b.kind !== "queue") continue;
		arrayTables.push({
			path: ["queues", "producers"],
			entries: { binding: b.binding, queue: b.queue },
		});
	}
	for (const b of bindings) {
		if (b.kind !== "queue" || !b.consumer) continue;
		const { maxBatchSize, maxBatchTimeout, maxRetries } = b.consumer;
		arrayTables.push({
			path: ["queues", "consumers"],
			entries: {
				queue: b.queue,
				max_batch_size: maxBatchSize,
				max_batch_timeout: maxBatchTimeout,
				max_retries: maxRetries,
			},
		});
	}

	for (const b of bindings) {
		if (b.kind !== "analytics_engine") continue;
		if (b.dataset.length === 0) {
			throw new Error(
				`Invalid analytics_engine "${b.binding}": dataset must be a non-empty string.`,
			);
		}
		arrayTables.push({
			path: ["analytics_engine_datasets"],
			entries: { binding: b.binding, dataset: b.dataset },
		});
	}

	for (const b of bindings) {
		if (b.kind !== "rate_limiter") continue;
		const { limit, period } = b.simple;
		if (!Number.isInteger(limit) || limit <= 0) {
			throw new Error(
				`Invalid rate_limiter "${b.binding}": limit must be a positive integer (got limit=${limit}).`,
			);
		}
		// Cloudflare rate-limiter bindings only accept period 10 or 60 (seconds).
		if (period !== 10 && period !== 60) {
			throw new Error(
				`Invalid rate_limiter "${b.binding}": period must be 10 or 60 (got period=${period}).`,
			);
		}
		// The unsafe-binding form: docs/architecture/plugins/cloudflare.md, "Rate limiters".
		arrayTables.push({
			path: ["unsafe", "bindings"],
			entries: {
				name: b.binding,
				type: "ratelimit",
				namespace_id: rateLimitNamespaceId(workerName, b.binding),
				simple: { limit, period },
			},
		});
	}
}

export function aggregateDevVars(
	secrets: Array<{ name: string; devDefault: string }>,
): string | null {
	if (secrets.length === 0) return null;
	const lines = secrets.map(
		(s) => `${s.name}=${escapeDevVarValue(s.devDefault)}`,
	);
	return `${lines.join("\n")}\n`;
}

// ── .dev.vars value escaping ─────────────────────────────────────────
//
// wrangler/miniflare read `.dev.vars` with dotenv semantics:
//   KEY=value            (unquoted; trimmed; value ends at EOL)
//   KEY="value"          (double-quoted; \n \r \t unescaped; \\ \")
//   KEY='value'          (single-quoted; no escapes; value as-is)
//
// Unquoted values cannot contain: newline, carriage return, tab, form-feed,
// vertical-tab, double or single quote, backslash, equals (some parsers split
// twice), hash (starts a comment on most parsers), dollar (variable
// interpolation on some), or leading/trailing whitespace (dotenv trims it).
// We allowlist a known-safe character class and quote otherwise. Double quotes
// let us escape whitespace that can't appear literally on a line, so we prefer
// them; internal `\` and `"` become `\\` / `\"`, and `\n` / `\r` / `\t` /
// `\f` / `\v` become two-char escapes.
//
// `\f` and `\v` are rare but real — encoding them means a value containing a
// form-feed or vertical-tab survives a round-trip through every dotenv-flavour
// parser we could plausibly meet, instead of relying on each one to handle a
// literal control character inside a quoted string.
//
// The empty string must also be quoted — bare `KEY=` is ambiguous (dotenv may
// parse it as null/undefined rather than empty-string).
const UNQUOTED_SAFE = /^[A-Za-z0-9_./:@+-]*$/;

export function escapeDevVarValue(value: string): string {
	if (value === "") return '""';
	// Reject leading/trailing whitespace unquoted — dotenv would trim it.
	if (UNQUOTED_SAFE.test(value) && value === value.trim()) return value;
	const escaped = value
		.replace(/\\/g, "\\\\")
		.replace(/"/g, '\\"')
		.replace(/\n/g, "\\n")
		.replace(/\r/g, "\\r")
		.replace(/\t/g, "\\t")
		.replace(/\f/g, "\\f")
		.replace(/\v/g, "\\v");
	return `"${escaped}"`;
}
