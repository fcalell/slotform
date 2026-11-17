import {
	and,
	asc,
	Column,
	desc,
	eq,
	getTableColumns,
	gt,
	gte,
	is,
	isNull,
	lt,
	lte,
	or,
	type SQL,
	sql,
} from "drizzle-orm";
import type { SQLiteColumn } from "drizzle-orm/sqlite-core";
import { ApiError } from "../error.ts";

export const DEFAULT_LIMIT = 20;
// What no procedure may name as its `maxLimit`: a page this large is a table
// scan the client asked for by mistake.
export const LIMIT_CEILING = 10_000;

export type Direction = "asc" | "desc";

/** One column a page orders by. */
export interface Order {
	column: SQLiteColumn;
	direction: Direction;
}

/** The `sort` a procedure declaring `sort: [...keys]` takes: a key of the procedure's `sorts` (else a column key of the table) and the way round. */
export interface SortInput<K extends string = string> {
	column: K;
	direction: Direction;
}

/** What a sort key orders by: a column, or for a window an SQL expression (`sql\`${tasks.title} collate nocase\``, `bm25(...)`). */
export type Orderable = SQLiteColumn | SQL;

/** The sort key to ordering map a procedure names, for a key that is not a column of the table or orders by an expression. */
export type Sorts<K extends string = string, V = SQLiteColumn> = Record<K, V>;

type CursorValue = string | number | boolean | Date | null;

// A moment travels as `{ $date }`: the cursor is JSON, which has no date, and
// the page that decodes it has no column type to say a number is one.
function toWire(value: CursorValue): unknown {
	return value instanceof Date ? { $date: value.getTime() } : value;
}

function fromWire(value: unknown): CursorValue | undefined {
	if (typeof value === "object" && value !== null && "$date" in value) {
		const at = (value as { $date: unknown }).$date;
		return typeof at === "number" ? new Date(at) : undefined;
	}
	return value === null ||
		typeof value === "string" ||
		typeof value === "number" ||
		typeof value === "boolean"
		? value
		: undefined;
}

// Base64 of the JSON's UTF-8 bytes: a title is not Latin-1, which `btoa` takes.
function toBase64(text: string): string {
	let binary = "";
	for (const byte of new TextEncoder().encode(text)) {
		binary += String.fromCharCode(byte);
	}
	return btoa(binary);
}

function fromBase64(encoded: string): string {
	const binary = atob(encoded);
	return new TextDecoder("utf-8", { fatal: true }).decode(
		Uint8Array.from(binary, (char) => char.charCodeAt(0)),
	);
}

/** A cursor for the row after which the next page continues: the order columns' values, in order, then the row's id. */
export function encodeCursor(
	values: readonly CursorValue[],
	id: string,
): string {
	return toBase64(JSON.stringify([values.map(toWire), id]));
}

export function decodeCursor(cursor: string): {
	values: CursorValue[];
	id: string;
} {
	const malformed = () =>
		new ApiError("BAD_REQUEST", { message: "Invalid cursor" });
	let parsed: unknown;
	try {
		parsed = JSON.parse(fromBase64(cursor));
	} catch {
		throw malformed();
	}
	if (!Array.isArray(parsed) || parsed.length !== 2) throw malformed();
	const [wire, id] = parsed as [unknown, unknown];
	if (!Array.isArray(wire) || typeof id !== "string" || !id) throw malformed();
	const values = wire.map(fromWire);
	if (values.some((value) => value === undefined)) throw malformed();
	return { values: values as CursorValue[], id };
}

/** A limit within 1 and `LIMIT_CEILING` (the procedure's own `maxLimit` already bounded what it took), defaulting to `DEFAULT_LIMIT`. */
export function clampLimit(limit: number | undefined): number {
	return Math.max(1, Math.min(limit ?? DEFAULT_LIMIT, LIMIT_CEILING));
}

/** Drizzle's relational `columns`, narrowed to exclusion so `id` stays; the order columns stay too, whatever it names. */
export type ExcludedColumns<T> = {
	[K in Exclude<keyof T, "id">]?: false;
};

export interface PageOptions<C = object, K extends string = string> {
	where?: SQL;
	limit?: number;
	/** The default order: one column, or several in precedence. `id` follows in the first one's direction. */
	orderBy: Order | readonly Order[];
	/** The caller's order, a procedure's `input.sort`: it replaces `orderBy` with the ordering `sorts` maps its key to (else the column of `idColumn`'s table it names), so a Table's header sort reaches the query. */
	sort?: SortInput<K> | undefined;
	/** The ordering each sort key stands for, where a key is not a column's name. */
	sorts?: Sorts<K>;
	idColumn: SQLiteColumn;
	columns?: C;
}

export interface PaginateOptions<C = object, K extends string = string>
	extends PageOptions<C, K> {
	cursor?: string;
}

export interface PaginatedResult<T> {
	data: T[];
	nextCursor: string | null;
}

// An unknown sort column answers BAD_REQUEST (a procedure that declares `sort`
// already refuses it at the schema).
function orderOf(options: PageOptions<unknown, string>): Order[] {
	const { sort, idColumn } = options;
	if (sort) {
		const found = sortOf(sort.column, options.sorts, idColumn);
		if (!found || !isColumn(found)) {
			throw new ApiError("BAD_REQUEST", {
				message: `Cannot sort by ${sort.column}`,
			});
		}
		return [{ column: found, direction: sort.direction }];
	}
	return Array.isArray(options.orderBy)
		? [...options.orderBy]
		: [options.orderBy as Order];
}

// What a sort key orders by: its entry in `sorts`, else the table's column of
// that name. Own keys only, so `constructor` is not a column.
export function sortOf(
	key: string,
	sorts: Readonly<Record<string, Orderable>> | undefined,
	idColumn: SQLiteColumn,
): Orderable | undefined {
	const from = sorts ?? getTableColumns(idColumn.table);
	return Object.hasOwn(from, key) ? (from[key] as Orderable) : undefined;
}

function isColumn(value: Orderable): value is SQLiteColumn {
	return is(value, Column);
}

function keysOf(orders: readonly Order[], idColumn: SQLiteColumn): string[] {
	const columns = Object.entries(getTableColumns(idColumn.table));
	return orders.map(({ column }) => {
		const found = columns.find(([, each]) => each === column);
		if (!found) {
			throw new Error(
				`paginate: the order column ${column.name} is not a column of the table ${idColumn.table}`,
			);
		}
		return found[0];
	});
}

// The rows strictly after the cursor's, in order, as keyset segments read one
// after another. Within a segment, for columns c1..cn and id, (c1 > v1) or
// (c1 = v1 and c2 > v2) or ... or (all equal and id > vid), each `>` a `<` in a
// descending column; the id follows the first column's way. Nulls sort last,
// so nothing is past a null value, which compares by `is null`. A nullable
// column holding a value closes the segment: the rows of the same prefix with a
// null there follow as a segment of their own, then the shallower branches.
// One statement with an `or c is null` term loses the index order, and SQLite
// sorts the scope.
function segments(
	orders: readonly Order[],
	idColumn: SQLiteColumn,
	cursor: { values: readonly CursorValue[]; id: string },
): SQL[] {
	if (cursor.values.length !== orders.length) {
		throw new ApiError("BAD_REQUEST", { message: "Invalid cursor" });
	}
	const steps = [
		...orders.map((order, at) => ({
			column: order.column,
			direction: order.direction,
			value: cursor.values[at] as CursorValue,
		})),
		{
			column: idColumn,
			direction: orders[0]?.direction ?? "asc",
			value: cursor.id,
		},
	];
	// Each step's column is of some type the value must match; `SQLiteColumn`
	// does not carry it, so the comparison takes the value as `never`.
	const equal = steps.map((step) =>
		step.value === null
			? isNull(step.column)
			: eq(step.column, step.value as never),
	);
	const found: SQL[] = [];
	let branches: SQL[] = [];
	// The segment's shallowest column bounded by its value, which every branch
	// implies: SQLite takes no range from the `or` alone and walks the scope.
	let bound: SQL | undefined;
	// `and` and `or` answer `undefined` only for no conditions; each here has one.
	for (const [at, step] of [...steps.entries()].reverse()) {
		if (step.value === null) continue;
		const [past, from] = step.direction === "desc" ? [lt, lte] : [gt, gte];
		branches.unshift(
			and(...equal.slice(0, at), past(step.column, step.value as never)) as SQL,
		);
		bound = from(step.column, step.value as never);
		if (step.column.notNull) continue;
		found.push(
			and(bound, or(...branches)) as SQL,
			and(...equal.slice(0, at), isNull(step.column)) as SQL,
		);
		branches = [];
	}
	if (branches.length > 0) found.push(and(bound, or(...branches)) as SQL);
	return found;
}

interface QueryBuilder<T, C> {
	findMany(config: {
		columns?: C;
		where?: SQL;
		limit?: number;
		offset?: number;
		orderBy?: SQL[];
	}): Promise<T[]>;
}

// Drizzle's `columns` with the order columns and the id put back, which the
// cursor reads off the last row.
function withKept<C>(
	columns: C | undefined,
	keys: readonly string[],
): C | undefined {
	if (!columns) return undefined;
	const kept = { ...columns } as Record<string, unknown>;
	for (const key of [...keys, "id"]) delete kept[key];
	return kept as C;
}

export function orderSql(
	orders: readonly { column: Orderable; direction: Direction }[],
	idColumn: SQLiteColumn,
): SQL[] {
	const direction = orders[0]?.direction ?? "asc";
	const by = direction === "desc" ? desc : asc;
	// The id, a primary key, is never null; `nulls last` on it as a later term
	// makes SQLite 3.54 sort an ascending page in a temp B-tree.
	return [
		...orders.map(
			(order) =>
				sql`${order.direction === "desc" ? desc(order.column) : asc(order.column)} nulls last`,
		),
		by(idColumn),
	];
}

export async function paginate<
	T extends { id: string },
	const C extends ExcludedColumns<T> = object,
	K extends string = string,
>(
	queryBuilder: QueryBuilder<T, NoInfer<C>>,
	options: PaginateOptions<C, K>,
): Promise<PaginatedResult<Omit<T, keyof C>>> {
	const limit = clampLimit(options.limit);
	const { idColumn } = options;
	const orders = orderOf(options as PageOptions<unknown, string>);
	const keys = keysOf(orders, idColumn);

	// The first page is one statement: the whole order, nulls last.
	const reads = options.cursor
		? segments(orders, idColumn, decodeCursor(options.cursor))
		: [undefined];
	const columns = withKept(options.columns, keys);
	const orderBy = orderSql(orders, idColumn);
	const rows: T[] = [];
	for (const segment of reads) {
		if (rows.length > limit) break;
		rows.push(
			...(await queryBuilder.findMany({
				...(columns ? { columns } : {}),
				where: and(options.where, segment),
				limit: limit + 1 - rows.length,
				orderBy,
			})),
		);
	}

	const hasMore = rows.length > limit;
	const data = hasMore ? rows.slice(0, -1) : rows;
	const lastItem = data[data.length - 1] as Record<string, unknown> | undefined;

	return {
		data: data as Omit<T, keyof C>[],
		nextCursor:
			hasMore && lastItem
				? encodeCursor(
						// `withKept` keeps the order columns, which hold a cursor value.
						keys.map((key) => lastItem[key] as CursorValue),
						lastItem.id as string,
					)
				: null,
	};
}
