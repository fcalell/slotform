// A title wraps to `ROW_TITLE_LINES` lines and keeps its longest word whole:
// docs/architecture/ui-core/layout.md, "Title and facts". Tailwind reads the
// class as written, so the count is spelled here and `title.test.ts` holds it
// to the constant.
export const TITLE_COMPACT = "line-clamp-3 whitespace-normal break-words";
export const TITLE_ADAPTS =
	"row-two-line:line-clamp-3 row-two-line:whitespace-normal row-two-line:break-words";
