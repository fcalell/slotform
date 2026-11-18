import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { ResolvedDbOptions } from "../types.ts";

// The plugin's gitignored workspace in the consumer's project: drizzle-kit
// configs, the migration lock, the drift copy and the seed file.
export const DB_KIT_DIR = ".db-kit";

export function migrationsDir(cwd: string, options: ResolvedDbOptions): string {
	return join(cwd, options.migrations);
}

/** The `.sql` files of a migrations directory, by name (drizzle-kit's tags sort in journal order); none when the directory is missing. */
export function migrationFiles(dir: string): string[] {
	if (!existsSync(dir)) return [];
	return readdirSync(dir)
		.filter((f) => f.endsWith(".sql"))
		.sort();
}

export interface JournalEntry {
	idx: number;
	tag: string;
}

/** drizzle-kit's journal entries of a migrations directory, in `idx` order; null without a journal. */
export function readJournal(dir: string): JournalEntry[] | null {
	const path = join(dir, "meta", "_journal.json");
	if (!existsSync(path)) return null;
	// drizzle-kit's journal file: every field is read as optional.
	const journal = JSON.parse(readFileSync(path, "utf-8")) as {
		entries?: JournalEntry[];
	};
	return [...(journal.entries ?? [])].sort((a, b) => a.idx - b.idx);
}

// The two keys of a drizzle snapshot the plugin reads. The file carries far
// more (indexes, FKs, checks); reading only these survives snapshot-version
// bumps that leave `tables` and `views` intact.
export interface Snapshot {
	tables?: Record<
		string,
		{ columns?: Record<string, { name?: string } | undefined> }
	>;
	views?: Record<string, unknown>;
}

/** The snapshot drizzle-kit wrote with a journal entry, named by its tag's prefix as drizzle-kit names it; empty where there is none. */
export function readSnapshot(dir: string, entry: JournalEntry): Snapshot {
	const prefix = entry.tag.split("_")[0];
	const path = join(dir, "meta", `${prefix}_snapshot.json`);
	if (!existsSync(path)) return {};
	// drizzle-kit's snapshot file: every field is read as optional.
	return JSON.parse(readFileSync(path, "utf-8")) as Snapshot;
}

/** The newest journal entry's snapshot; empty where there is none. */
export function newestSnapshot(dir: string): Snapshot {
	const newest = readJournal(dir)?.at(-1);
	return newest ? readSnapshot(dir, newest) : {};
}
