// A page's size bounds, import-free so the procedure factory reads them
// without the pagination helpers' drizzle import.

// The rows a page holds unless the caller names a `limit`.
export const DEFAULT_LIMIT = 20;
// What no procedure may name as its `maxLimit`: a page this large is a table
// scan the client asked for by mistake.
export const LIMIT_CEILING = 10_000;
// What a paginated procedure accepts unless it names its own `maxLimit`.
export const MAX_LIMIT = 100;
