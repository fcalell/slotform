import { newestSnapshot } from "./layout.ts";

// The table-copy rewrite: docs/architecture/plugins/db.md, "drizzle-kit".

/** The columns of each table in the newest drizzle snapshot of a migrations dir, or none where there is no snapshot. */
export function columnsBefore(
	migrationsDir: string,
): Map<string, ReadonlySet<string>> {
	const out = new Map<string, ReadonlySet<string>>();
	const { tables = {} } = newestSnapshot(migrationsDir);
	for (const [table, def] of Object.entries(tables)) {
		out.set(
			table,
			new Set(
				Object.entries(def.columns ?? {}).map(
					([key, column]) => column?.name ?? key,
				),
			),
		);
	}
	return out;
}

const unquote = (name: string): string =>
	name.trim().replace(/^[`"]|[`"]$/g, "");

const COPY =
	/INSERT INTO `__new_(\w+)`\(([^)]*)\) SELECT ([^;]*?) FROM `(\w+)`;/g;

/** The migration with each table copy's column lists cut to the columns the table had before it. Pairs `("a", "b")` and `"a", "b"` stay pairs: the target and the source list are cut together. A migration with no copy, or a copy of a table the snapshot does not hold, is returned as it is. */
export function copyOnlyExisting(
	sql: string,
	before: Map<string, ReadonlySet<string>>,
): string {
	return sql.replace(
		COPY,
		(
			whole: string,
			table: string,
			into: string,
			from: string,
			source: string,
		) => {
			const had = before.get(source);
			if (!had || table !== source) return whole;
			const targets = into.split(",").map(unquote);
			const reads = from.split(",").map(unquote);
			if (targets.length !== reads.length) return whole;
			const keep = reads.flatMap((read, at) => (had.has(read) ? [at] : []));
			if (keep.length === reads.length || keep.length === 0) return whole;
			const quoted = (names: string[]) =>
				keep.map((at) => `"${names[at]}"`).join(", ");
			return `INSERT INTO \`__new_${table}\`(${quoted(targets)}) SELECT ${quoted(reads)} FROM \`${source}\`;`;
		},
	);
}

const INDEX =
	/(CREATE (?:UNIQUE )?INDEX `\w+` ON `(\w+)` \()(.*)(\)(?: WHERE [^\n]*)?;)/g;

/** The migration with an index expression written as the SQL it is. drizzle-kit writes an expression index (``index().on(sql`${t.title} collate nocase`)``) as it is when it creates the table, but when it rebuilds the table it quotes the whole expression as a column name (`` `"title" collate nocase` ``), which SQLite reads as a missing column. An item in an index's list that names no column of its table, in the newest snapshot, is an expression: its quotes come off. */
export function expressionIndexes(
	sql: string,
	columns: Map<string, ReadonlySet<string>>,
): string {
	return sql.replace(
		INDEX,
		(
			whole: string,
			head: string,
			table: string,
			list: string,
			tail: string,
		) => {
			const has = columns.get(table);
			if (!has) return whole;
			const fixed = list.replace(/`([^`]*)`/g, (item, inner: string) =>
				has.has(inner) ? item : inner,
			);
			return `${head}${fixed}${tail}`;
		},
	);
}
