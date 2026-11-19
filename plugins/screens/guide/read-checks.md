# Read checks

Two checks of [the test run](test-run.md) judge how a screen draws its reads: the loading shift
and each read failed.

## The loading shift

A Section stands whatever its data holds, so the page holds still when the data arrives. In a
Loading story the run measures each Section at each width while the calls are held, answers them,
waits until the page has settled, and measures again. Each Section is judged against the Sections
above it in its column of its Pane, never against one beside it, and pairs with its waiting form by
its position in the column, never by title. It reports:

- a Section that stood while waiting and is gone loaded (loaded Sections below the paired ones are
  no findings);
- a first Section of a column moving by other than what the text above it grew by (the head's name,
  facts or description, or prose, wrapping to more lines; in a column the page centres, a Gate's,
  also by half of what the column's height changed by); a toolbar, a bar or a tabs row above it
  changing height fails;
- any other Section moving by other than what the Sections above it grew by;
- a Section changing height with no rows, chart or text in it, in either form.

A Pane with no Section is judged by the tops of its body's direct blocks. A docked Sheet and a modal
Sheet's dialog are judged as a Pane is, and the Sheet's own head credits their first Section. A move
that a block caused, one absent while waiting and present loaded above the moved one (a Banner that
stands only with its data), by at least its height, is reported and not failed; every other finding
fails the screen. A failure of a first Section says how much of its move the text explains
(`62px of it the text's growth, -6px unexplained`): what is left is another block above it changing
height, such as a Stats strip's painted rows or a tabs row.

The fix is in the screen's outline, never in the paint, which is the loaded shape already:

- give every Section a `read`;
- put a Banner or a PendingBar whose condition lands with the data where it reads best (what is
  under it moves once, which is reported);
- keep a text that wraps short enough to wrap the same painted and loaded;
- draw one painted Section while a list of one Section per record waits.

## Each read failed

The error story fails every query at once, so a frame that holds a read nobody else does never meets
it alone. After the Data story's checks, when the screen called two or more procedures, the run
fails each procedure in turn, every other answering its fixture, and runs the overflow, the render
walk and the console check at each width once the page has settled.

The reads are the procedures the Data story called, so a read that depends on another's answer, or
an ambient one, is covered like any other. Each finding is prefixed `with <procedure> failed:`, and
the usual one is
`with usage.plan failed: console.error: The read [["usage","plan"],…] failed and no frame holds it`:
a Section, Pane, Sheet or Form that draws a read needs `read={…}` on it, or its failure draws
nowhere and the leaf stays painted.

Empty, not found, waiting and axe are not repeated per read. A failed read retries once before it
fails, so a screen costs about two seconds for each procedure it calls.
