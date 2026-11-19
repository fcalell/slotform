# Tables and long collections

How a comparison and a long list stand on the phone: the `Table` as rows below `tablet`, the rows of
inline terms, a paginated collection's next page, and what the phone leaves out of the web's
collections. The props are `content.md`.

## A table below `tablet`

A comparison is a `Table` whose cells hold a value per column: its first column names the fact, a
column follows for each compared thing, and a `chip` or `status` column carries a fact's mark or
verdict. The `Table` alone reads the window: from `tablet` wide it is a grid, below it one row per
record. In the list form each status column is a status badge with its tone mark (the first leads the
row's badges; several say their column, `Staging: Passing`), a column of changes and a `wrap` column
are the row's `line` (never a cut fact; several joined by "; "), a value longer than the short measure
is its `line` too, said whole with its column's label, and values of a kind that stands in several
columns each say their column. A Section over a tree counts its top-level rows; a top-level row that
is no item (an add row) says `counted: false`, and a nested row that is an item in its own right says
`counted: true`.

Rows of inline terms (a mapping of sources to targets, a filter's conditions) are `Rules`. A pick of
several outside a rule is a `Picker` given an array `value`.

## Long collections

A `Thread`, a searching Picker's sheet, and a `Section` or `Table` that is a Pane's only child show
only the rows near the view; put a long list alone in its Pane to get that. Next to other content a
list draws every row.

A collection over a paginated read (`orpc.x.list.pages(input)`) that stands alone in its Pane loads
its next page as the viewer scrolls near its end. Next to other content, or under 50 rows, it ends in
a more row of its own, "Show more", pressed by the viewer. While the next page loads, `PAINT_ROWS`
painted rows follow the loaded ones, and a failed page is "Couldn't load more." with Retry. The frame
is not busy for it and its Section draws no count while more remains; an empty first page with more
is fetched on, not drawn empty.

## What the phone leaves out

A `PlaceSpec`'s `children` (nested places) are web only: the tab bar and the More page are flat and
draw the top level, so a nested place is reached from a page of its own (a `Section` of rows) on the
phone; a route under a branch still selects the branch's tab. The web's drag, drop and reorder
(`drag`, `drop` and `reorder` on a `Table`, a row and a place) and a `Table` row's `act` and `more`
regions are web only: the phone ignores them, so a row's acts there are its own `act` and `more`.
