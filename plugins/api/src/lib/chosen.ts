import { and, type SQL, sql } from "drizzle-orm";
import type { SQLiteColumn } from "drizzle-orm/sqlite-core";
import type { Selector } from "../schema.ts";

export interface ChosenOptions<Q> {
	/** The table's id column. */
	id: SQLiteColumn;
	/** The where clause of the read's query, the one its list procedure builds from the same input. */
	where: (query: Q) => SQL | undefined;
}

// A D1 statement binds at most 100 values, so a list of ids travels as one
// JSON value that `json_each` expands.
function idList(ids: readonly string[]): SQL {
	return sql`(select value from json_each(${JSON.stringify(ids)}))`;
}

/** The rows a selector names, as a where clause: `{ ids }` those rows, `{ query, except }` every row the query matches but the excepted. Each list binds one value, whatever its length. */
export function chosenWhere<Q>(
	selection: Selector<Q>,
	options: ChosenOptions<Q>,
): SQL {
	const { id } = options;
	if ("ids" in selection) return sql`${id} in ${idList(selection.ids)}`;
	const matching = options.where(selection.query);
	const kept =
		selection.except.length > 0
			? sql`${id} not in ${idList(selection.except)}`
			: undefined;
	return and(matching, kept) ?? sql`1 = 1`;
}
