# Layout

How the layout components lay out a page on both platforms: the `Shell` and its places, the `Gate`,
the `Panes` and its Panes, the `Pane`'s bar, body and foot, the `Sheet`, the `Section` and its rows,
the heading levels, the cards, the rows grid that aligns every label of a Pane, and the overflow rules
that decide a row's or a head's form. The contracts live in `@slotform/ui-core`'s roster
(`roster/<component>.ts`), `overflow.ts`, `list-state.ts` and `variants.ts`; `@slotform/react-ui`
and `@slotform/native-ui` draw them. What a frame draws while its reads wait or fail is in
[reads](reads.md); the roster and its matrices are in [roster](roster.md); the measures and
densities are in [tokens](tokens.md).

## Shell

The **Shell** is the root container of an app's signed-in pages: the sidebar on the desktop, the tab
bar on touch, and a column that holds the current place.

### Sidebar and groups

- A Shell whose places name groups (each listed in `groups`, which carry the icon) draws the
  sidebar as a rail of icon entries beside the docked column of the current place's group. The
  ungrouped places come first on the rail, named by their first place, a press going to the
  group's first place; the footer places and the dock act stand at the rail's foot. The column
  holds the group's switcher and its places; the app's switcher leads the rail. A Shell with no
  groups keeps the one sidebar.
- A pointer resting on a rail entry, or a focus on it, shows that entry's group in the column.
  Folded to the rail, the sidebar opens over the page to its labels with that column beside it
  instead. It goes back once the pointer and the focus leave, on Escape or when the route changes;
  a menu or sheet the column opened holds it open, and a pointer heading for the column keeps the
  group shown.
- The sidebar draws the consecutive places of one group as a group under the group's heading. A
  group that owns its places (a `places` of its own) stands where it stands in `groups`: before the
  first plain run whose group `groups` lists after it, else after the plain runs. The footer group
  is drawn apart.
- The rail is `SHELL_RAIL`, with the column beside it at `SHELL_SIDEBAR`'s width. `GroupSpec.icon` is
  required, and the Shell throws when a place names a group that `groups` does not list. The
  column's fold is the viewer's, kept in the same `localStorage` store as the branches' folds
  (`lib/folds`); the group the viewer pressed is plain state that a route change drops.
- On touch the places layer lists the groups first.

### Places

- A place's `group` is the name of the group it stands in (a word; it truncates), which the Shell's
  `groups` lists. A group is an entry on the rail and the column that entry shows; a place with no
  `group` stands in the ungrouped run, the rail's first entry.
- A place with `end` stands in the footer group at the sidebar's bottom (settings, an exit), after
  the others and under no label. `end` places have no children.
- A place's `children` (`PlaceSpec.children`) are the places under it, each with children of its
  own to any depth: the place is a **branch**, and its sidebar row opens and folds them one level
  in. A nested run is a WAI-ARIA tree built on the one tree model of `list-state.ts` (`treeRows`,
  `treeMove`) that a Section's tree uses, with a branch's fold act at the end of its row and each
  level one `stack` step in, as a tree row's (`PLACE_NEST`). A branch is a place like any other
  (its route, its count, its `drop`); its row also carries the viewer's choice of open or folded,
  kept in `localStorage` per branch route (a convenience, as a table's columns are). Unchosen, a
  branch is open when the current place is under it, else folded (`placesFolded`). A branch is drawn as on the current place's path when it is the
  current place's ancestor. A place named by `group` carries its children into that group's run.
  The showcase's boards are such a tree: a leaf takes a dragged task and shows the count of what it
  holds, and a folder is a place that only opens and folds (its route is a spot).
- The phone's tab bar and More page draw the top level only: they ignore `end` and
  `children`, and read `group` only for the switcher the More page draws over a group's places, except that a route under a branch selects its tab.
- A place with a `drop` takes what is dragged from a row; the container draws the label that follows
  the pointer and the line a reordered row lands at ([drag](drag.md)).
- The routes a descriptor carries are `Route`s, typed by the platform's `RouteRegistry`
  ([the canon](roster.md#the-canon-and-the-closed-props)).

### Column and foot

- The column holds the place: the route's Panes in a row, each but the last at the list width
  giving way to its floor, the last taking the rest, and below `tablet` of the column only the last
  standing ([Panes](#panes)). A route draws no place of its own.
- A Shell's `foot` stands under the place across the column (on the phone, above the tab bar),
  whatever the route: the app's own, or a `Dock` for a player ([sound](sound.md)). The Shell draws
  nothing there without one and owns no sound.

### On the phone

The phone's Shell lays out, on the column's ground: the banner under the status bar, the content,
the app's `foot` above the tab bar, the toast queue over the page's box (the Pane's body over its
docked foot and the tab bar), the `confirm()` decisions as a sheet, and the tab bar over the home
indicator. Past five places the tab bar holds four and a More tab that opens a page of the rest in
the content's place. The Shell hands its switcher to each Pane, which draws the switcher's trigger
at the start of its bar when it has no back act. The tab bar stands under the `Panes` the Shell
draws around the screen, and the current place's route is handed down for a read that answers not
found. The sheets' provider, the toasts, the sheet outlet and the `confirm()` host are `ContainerHost`'s.

### Toasts

The app has one toast queue, and every root container on the page (a Shell, a Gate) stands it in its
layer. A container hears the queue only from the moment it mounts and listens, so a toast raised before
a root container mounts never reaches it; one container of the page raises the queue. Each toast leaves
after its time. A page's body makes space for the toasts' layer ([Pane foot](#foot)).

## Gate

The **Gate** is the layout container of a page outside the shell (sign-in, a consent step), a root
container as the Shell is:
one centred column at the `auth` width holding the step, a fields gap between every part:

1. the app's lockup, its logo and name, which the app gives the UI plugin once (a drawn lockup
   two body lines tall, `GATE_LOGO`);
2. an optional `StepCount`;
3. the title, required, the page's one `h1`;
4. the description, its strong runs at 500;
5. a `Banner`;
6. the step's body;
7. the `form`, its fields a card and its bar after it;
8. the `acts`, an `ActionBar`.

It hosts `toast()` and `confirm()` as the Shell does and draws no word of its own. On touch it spans
the viewport inside the page inset on the surface and the step stands at the top; the phone keeps
the safe area and scrolls over the keyboard, so the focused field and the submit act stay in view.
The first field of a step takes focus: an `Input` or code `Input` that mounts in it takes focus
unless one already holds it, each step claiming afresh as its field mounts. A step's `form` is a
Form's props over the step's procedure, drawn after the children: a card of its fields with its bar
after the card on the web, its bar drawn `full` on the phone. A step with local state only draws its
controls in its children. A first run is a titled Gate whose body is its `Button`s.

## Panes

The **Panes** is what the Shell's column holds: a row of two Panes at most, the place's own and a
record's after it, and the size container they read to know whether they stand side by side
(`place-max-tablet:`). The Shell draws it around the route's Panes, so a page places none: a page
is the Panes in the place, and the container reads nothing of what stands in them. The Panes is a flex
row that draws no bar, and each Pane a flex column.

- **Why a flex row.** A grid cannot size its last track without counting Panes, and `auto` tracks
  collapse under size containment. A Pane cannot choose its form by a sibling selector
  (`:has(~ [data-page])`) or by a context the Panes counts, since no component reads its children
  ([structure](../../../packages/ui-core/guide/structure.md#reading)). So the Panes's own CSS says
  which Panes stand, by structural selectors (`:last-of-type`, `:nth-last-of-type`).

- **One Pane of each kind.** A Panes holds the place's Pane and one record's Pane at most. A record
  linked from a record opens in its own place, never as a third Pane, and a place's tabs are one
  Pane's, never a second. The Panes hands each Pane a register for its kind, which throws when a
  second Pane of that kind registers.
- **Sharing the row.** The Panes decides how its Panes share the row from each Pane's place among
  its siblings (`:first-of-type`, `:last-of-type`, the structure the route gave by the order it
  rendered them), so a Pane reads none of its siblings. A Pane is a `section`, the only one a Panes
  holds, so "of-type" counts Panes; "last" is the last Pane, never the last child, since a Sheet in
  the Panes leaves its focus guards (spans) after it. Each Pane marks itself `data-page`, which the
  Panes and the focus order name it by.
- **Widths.** The Pane before the last holds the `list` width and gives way to its floor
  (`region-min`); the last takes the rest, never under `list` where the Panes has space for both,
  yielding to the one before's floor where it has not. A hairline parts them. Both widths count
  characters of the body font (`ch`), so they follow the `size` knob. A Pane drawn alone is the
  last and takes the whole row. Below `tablet` of the Panes's width only the last stands: the
  place's Pane beside a record's is `display: none`. Narrow widths and Expand are this one CSS
  mechanism, the Panes's. Each Pane is the `page` size container and keeps its own scroll.
- **A main object.** A place's Pane that fills with wide content (a Canvas: `data-fill` holding
  `data-wide`) is the place's main object, so it takes the spare space and the record beside it holds
  `list` from `tablet`. Content decides it, as it decides a body's width ([Rows grid](#rows-grid)).
- **Expand.** An expanded record's Pane (`data-expanded`, set by its Expand act) hides the Pane
  before it (`:has(~ [data-expanded])`, the place's CSS the structure rules except), and takes the
  whole Panes. Both stay
  mounted, so the list's scroll and typed text survive, and the hidden Pane leaves the tab order.
  A Pane opened from another takes the keyboard on its first control (`usePaneFocus`).
- **A record's acts.** Only a record's head draws Back, Close and Expand; the place's Pane has none,
  since the sidebar moves between places. Close stands at the bar's end after Expand where the
  place's Pane can stand beside the record; Back stands alone at the bar's start below `tablet` of
  the Panes; Expand is dropped where nothing stands before the record to fold. Close and Back are
  routes that carry the address's query, so the place's Pane returns as it stood. The Panes says which
  stand through custom properties on the Pane (`--pane-back`, `--pane-close`, `--pane-expand`, a
  `display` each), so the head reads no sibling. A Pane drawn outside a Panes is alone, so its Back
  stands.
- **Distance.** The room set is the one density no query detects, so a room page states it
  (`Panes distance="room"`): the Panes draws the room set and the touch structure, its last Pane
  alone (so the head draws Back and neither of the others) and no menu act. The Shell draws the
  place at its own distance. The room set itself is in [tokens](tokens.md).
- **The name and the trail.** The Panes hands its Panes its name (the place's, the sidebar's label),
  which titles the place's Pane and stands before a record's name in a record's bar; outside a Panes
  there is none. The Shell hands them its **trail** (`placeTrail` in `route.ts`: each place from the
  top of its tree down to the current one, its label and route), whose places above the current one
  stand before the title ([Bar](#bar)); outside a Shell the trail is empty. The trail's last place's
  route is also where a read with no Pane's way back leads.
- **On the phone** a route draws one Pane, a deeper one pushed in expo-router's stack with the tab
  bar under it, so the Panes
  reads no child and draws no bar of its own: the Pane carries it.

## Headings

A heading's level comes from where it stands, never from its siblings.

- A page has one `h1`, the Panes's: the name of where you are, drawn apart from sight. The Shell
  gives it the current place's name; a Panes standing without a Shell (a room page) is given one by
  `title`, or draws none when a Gate in it is the page's `h1`.
- Every Pane's title is an `h2`, whether it stands alone or beside the other Pane, and hands 3 to
  its body, so a Pane reads nothing of the Panes around it.
- A sheet's title (its layer's head) is an `h2`, and hands 3 to what the layer holds, whatever
  opened it; its title is also the name a page title gives (a missing read's sentence draws no second
  `h2`, and a Table, a Thread's log or a `Columns` row in it is named by the sheet).
- A Section hands the next level to its body; a `Columns` hands its columns the level it stands
  at. HTML stops at `h6`.
- React Native exposes no heading level, so on the phone a Section's title is a header at any depth.
- A heading with no words, and no name of its own, gives a screen reader a stop that reads nothing,
  so a name that lands empty draws no heading; the showcase's Pane scene logs an error where a
  heading stands empty.

## Pane

The **Pane** is a column of the Shell's place, of two kinds: the place's own Pane, titled by the
place's name, and a record's Pane after it, titled by the record's name. Its bar stands over one
hairline, its body scrolls, and an optional foot docks under the body. A Pane is the size container
what stands in it decides its form by (a Table its grid).

### Bar

- On a place's Pane the bar holds the trail's places above it, then the title, then the acts and
  the more menu; on touch the shell's switcher leads it. A top-level place's Pane has no places
  above it, so its bar holds the title alone.
- On a record's Pane the bar holds the places above the record's place, the record's place, a slash
  and the record's name, then Expand
  (which folds the place's Pane away and turns to Collapse) and Close (back to the place's Pane as
  it stood, its tab and filters kept), Back instead of Close where the record's Pane stands alone,
  then the acts and more. The title is the record's name (a `Run`, the generic word for the kind
  while it loads) and the acts and more are the record's acts.
- The trail before the title is a `nav` landmark named by the `breadcrumb` word, in the meta ink,
  a slash in the mark ink after each place. The slash is drawn, never written: it is a mark at the
  non-text [floor](../../../packages/ui-core/guide/voice.md#floors), and a written slash would be text
  to the text floor's check and to a reader. A place whose
  route is a page is a link to it; a folder (a spot route) is text. The title, the current page, is
  never a link.
- On the desktop the trail always keeps the top place and the current place (a record's place, or
  the place's Pane's own title). The places between stand whole where the Pane is at least
  `trailWhole` wide (`overflow.ts`, the `trail-whole:` container variant) and below it fold into
  one `…` act (`morePlaces`), split off as the bar's acts are (`actsSplit`): its menu lists the
  pages among them, top first, and a folder, which leads nowhere, is left out, so a fold of folders
  alone draws no act. Both forms are drawn and the container query shows one. `trailWhole` is the
  shortest trail that folds (three places, each at the short measure with a slash after it) over
  the share of the bar the title's floor leaves (`1 - PAGE_TITLE_FLOOR`'s fraction), plus the
  page inset at both ends; past it a longer trail stands whole and its places truncate. The trail keeps
  its width up to three fifths of the title's line and the record's name gives way first; the
  title keeps its two fifths of the row.
- The bar holds one part where it is narrow: on the web's touch density the back act and the name,
  the trail dropped so the name is never cut to a few letters (a record whose read ended keeps its
  trail, having no name). The record head's overline leads with the trail there, and a place's Pane
  under other places stands its trail as an overline over its title: the trail's places a middle
  dot apart, cut at its start with an ellipsis so the nearest place always shows, the head's own
  parts after it cut at their end. On the phone every bar holds the trail as one text a middle dot apart:
  a record's bar the places above the record's place and that place, in place of the name; a
  place's bar the places above it and its own name, the screen's header. Several places are cut at
  the start, so the nearest stands; one place, a name, is cut at its end. The tab bar is flat, so a
  trail there has more than one place only where places nest.
- A bar with a title, a context pick and two acts keeps the title's two fifths of the row, and the
  pick's label truncates before it, at every width.
- The bar's acts carry the same wiring a Button's act does ([acts](acts.md)).

### Record head

- A record's `record` opens the body with the head, the Pane's own: the overline and the facts at
  the body's top, the name between them, standing whole and wrapping as the Pane's heading.
- A record's `image` stands beside them as the thumbnail tile (`ITEM_HEADER_PICTURE`) at the head's
  top: painted while its address is a read, a skeleton while the bytes come, an `ImageOff` glyph
  where it failed or the address is empty.
- A part, a fact or the name that is a selection paints in its place while its read waits and draws
  nothing once it ended (a status or a pick keeps its form, any other is a word), and the head is
  inert meanwhile. Each line keeps its line box, and the facts line keeps the height of the status
  that moves on it.
- A fact in words that opens a sheet is its words and a chevron in a `WORD_ACT`, a button named by
  the fact; one that goes to a route is the same box as a link. A fact that acts reaches past the
  facts line's text line above and below it: its hit box stands at the target height and the line
  at the meta line's, so the line keeps one height whichever kinds of fact it holds. The web reads
  the reach as `(target - 1lh) / 2`; the phone, with no `lh` unit, from the target and the meta line
  in px where it stands.
- On touch a record's name stands whole in the head under the bar, and the bar's name keeps its box
  but stands only once the head's name has scrolled up under the bar, so the page never shows the
  name twice, the second time cut. The wait is CSS: the head's name names a view timeline on the
  body that scrolls it, the Pane lifts the timeline over its bar (`record-scope` in `globals.css`),
  and the bar's name runs a scroll-driven animation on it (`record-name`, `record-name-waits`). A
  browser without scroll-driven animations keeps the bar's name standing.
- A record's Pane holds its record's parts in its body, since a Panes holds no third Pane: the
  showcase's deploy draws each step it opened as sections after its steps. The deploy's Pane holds
  its read by id, so an address after the deploy's removal draws the missing shape, and the route
  keys the Pane by the deploy, so state picked in it is the open deploy's.

### Body

- The body scrolls under the fixed head, taking a tab stop only while it scrolls with nothing
  tabbable inside. Its children stand a sections gap apart within the reading width at its start, so
  a label stays near its value and a Save near the fields it saves. Wide content (a Table, a line
  Diff, a code block, a Canvas, a chart) stands at the body's width ([Rows grid](#rows-grid)).
- A Thread or a Canvas that fills the body (`fill`), and the Pane's own failed, missing and empty
  shapes, take the free height by plain flex.
- On the phone a Section with items or a Table that stands alone in a Pane, with no record head, fills
  the body as a Thread does, and its rows scroll inside its card
  ([long collections](../plugins/native-ui.md#long-collections)); beside other parts it stands in the
  body's scroll.
- The `empty` of the Pane's `read` stands in place of the children, centred in what the body leaves
  (the sentence at meta, the act the filled one with the plus). It answers for the Pane's own read,
  so a Pane with no `read` takes no `empty`.
- A `read` that answers not found fills the page with the missing shape: no mark, the sentence in the
  meta ink (worded by `noun`, "Couldn't find this." without one) and the way back to the place's Pane
  as the hairline act with no plus, on the `error` state's class sets. The way back is the route a Pane's
  back act returns to, handed down by the container; with none it leads to the trail's last place ([Panes](#panes)). How the missing and failed shapes are worded and headed is in
  [reads](reads.md#missing-and-failed-shapes).
- On the phone every Pane scrolls in a keyboard-aware scroll pane. The bar in flow at a Form's end is
  what the keyboard must never cover. A tap on an act in it reaches the act and leaves the keyboard
  up (a docked Thread's composer's Send keeps typing); a tap on nothing still dismisses it.

### Foot

- A `foot` (a field) docks under the body and spans it. The route gives it, so the Pane decides it
  from its props and nothing in the body hands anything up. The showcase's assistant home docks its
  ask field (a `Composer`) there on touch, its sections scrolling under it; on the desktop the field
  stands under the exchange.
- A `Table`'s chosen bar is an `ActionBar` with `chosen` in the foot, standing at the body's
  column and start: the reading width, or the body's width where the body holds wide content, whose
  rows the bar acts on (`ACTION_BAR_CHOSEN_COLUMN` reads the property).
- A `Thread` among the sections keeps its input in reach as a `Composer` in the foot. A Thread's
  messages stand a sections gap apart, one rung above Prose's block gap, with the input under them;
  on the desktop its composer stands in a measure-wide **column class set**, so a docked foot spans the
  body and the field keeps the column. A column class set is a width and nothing else: the region that
  owns its container's width centres it (a docked foot), and among sections it keeps the region's start,
  as a paragraph's measure does.
- A `sheet` docks in the foot's place while it is open ([Sheet](#sheet)), the Pane measuring the
  foot's region for it.
- A body with no foot ends where the toasts' layer stands over it, so while a toast stands
  (`[data-toast]` in the web container's `main`; a queued toast on the phone) the body's end takes the
  toasts' reach as well (`PAGE_BODY_UNDER_TOAST`): two lines of a toast and its gaps, the layer's
  inset above and below, so the page's last line, and the act that raised the toast, scroll clear
  of it.

### Container context

The container molecules hand each other a few values through context:

- the Panes's name and the Pane counts ([Panes](#panes));
- the route a Pane's back act returns to ([Body](#body));
- the Shell's switcher on the phone, and on touch on the web the act that opens the Shell's places
  layer, which the Pane draws at the start of a bar with no way back (on the desktop there is none);
- what a docked foot's region hands the docked `Sheet` it draws, in whole pixels: `height`, the
  region the foot shares with what stands over it (a Thread or a footed Pane); `chrome`, the foot's
  own block padding and border and the block padding of the body over it; and `logFloor`, what the
  region keeps for a log above the foot (zero where none shares it). Container units cannot give the
  height: a size container takes no height from its content, so the region would collapse in a
  column of auto height. All three are zero until measured, where the body is unbounded.

## Sheet

A **sheet** holds a task (a form, a decision, an acknowledgement); a record is read in its Pane,
never in a sheet.

- The submit stands in the foot after the body, so it follows the fields it submits: after Cancel
  on the desktop, alone on touch, where the close act leads the head. A blocked submit's reason or a
  rejected act's sentence stands under it.
- A `submit` with no `onAct` acknowledges what the sheet shows ("I saved them"): its press closes the
  sheet, and it stands alone with no Cancel.
- `form` is a Form's props, drawn after the children in the sheet's column, its `bar` stuck to the
  edge of the body on the web and in the pinned foot on the phone. The sheet's `submit` and the
  form's `bar` are two ways to complete the task; a sheet is given one.
- A sheet is the modal sheet, except that a Pane's or a Thread's `sheet` docks in the foot instead,
  drawing the docked head and foot inside the foot's raised class set with no scrim. The docked foot's
  states are its submit's: pending, blocked (`disabled`) and failed (`error`: the act ready again,
  the rejection's sentence under it in the line a blocked reason keeps, in the field error's class set and
  ink).
- The sheet hosts its acts' attempt, its foot bar and its form's bar alike: its dismissal is held while
  one pends, unless it waits for a connection.
- A docked sheet's body height is capped (`tokens.ts`), in px, from `region` (the foot's region: the
  log and the foot), `pinned` (what the foot pins besides the body: the dock's chrome, the sheet's
  head, foot line, submit and reason), `floor` (the body's floor) and `logFloor` (the log's, zero in a
  region with no log). With space the cap is the body's share of the region, or the floor if larger;
  short of space the body gives to the log's floor first, then to its own floor, then below it. The
  pinned parts never give.

## Section

The **Section** is a titled part of a Pane's body: a heading row over a body that is either its
`children` (parts) or its `items` (a row list). The title is the heading size, folded or not,
and no Section stands in a Section.

### Head

- The title line is the fold toggle where the Section folds. A blocked act's reason stands on its
  own line under the head row, shown as a `Button`'s is ([touched](acts.md#touched)).
- Titled, the head stands over the body; a Section with `items` and no `title` draws the sheet alone.
- `description` paints where it will stand while its selection waits. Loaded, `""` draws no line, as
  an undefined one does, and so does one whose read ended, the read's holder saying why once.
- The count is the loaded rows', drawn with `items` only and never while the body waits. It counts
  the top-level rows, the items the Section lists, less those marked `counted: false` (an add row, a
  row that only points elsewhere), and at any depth below them the rows marked `counted: true` (a
  nested row that is an item in its own right); any other nested row is a part of its row. These two
  members are on the descriptors the Section lists (`listedRows`). A showcase journey tree shows it: its End row
  opts out, so the head says 1 step, the nested legs and steps being parts of it.
- A count is a list's, the things it holds, so a Section of facts draws none: one with `children`,
  one whose every row has a label (a definition list, `factsOnly`), or one given a single row alone, not in an array (a value), whatever its `read`
  holds. No count is drawn while more pages remain.

### Body of parts

With `children` the body is its parts a fields gap apart, each a card of its own (a Form, a Table, a
Stats, a BarChart, or a `Card` around anything else; [Cards](#cards)). The Section draws no card and
reads nothing of its children. The `empty` of its `read` stands in the body's place on a card of its
own; a Section with no `read` takes no `empty`.

### Row list

- With `items` (constants or a selection) the body is the row list on the card (`GROUP`),
  the card's hairline once between them. A row is a row item or a file ([Rows](#rows)).
- The Section is a frame of its items: it paints while the read waits, and its failed, missing and
  empty shapes stand in the sheet's place ([reads](reads.md#frames)). The showcase's deploy changes
  hold their files' read as the Section's items, so the list paints while it waits and the Section
  draws the failed and empty shapes; the diff reads the open file as a selection.
- A row with `children` makes the sheet a tree: the rows abut, each level one step in, and the
  Section owns which branches are folded (open by default), handing every row its depth and fold.
- `groups` draws a band (`LIST_BAND`, a `band` tall) over the rows of each group, in the groups'
  order: the label at the body role at 500, the count of its rows (none when empty, in the meta ink)
  and its icon act at the end, closed by a hairline in the edge colour, none above it. Rows with no
  group stand before the first band; in a tree the group is the root rows'. A painted sheet draws no
  band.
- Over a pages read the sheet ends in its more row ([reads](reads.md#paging)). The Table ends the same
  way.

### Acts and drag

- Every act a Section draws (its head act and more, a band's act, a row's act and more, an empty
  form's act) carries its `confirm`, `done`, `to` and `sheet` as a Button's act does; a row's act
  that opens a `sheet` opens it in the [sheet outlet](acts.md#sheets-an-act-opens).
- A row with a `drag` is dragged by a press that moves (a finger after a hold of `DRAG_DELAY`), and
  one with a `drop` takes what is released on it (`DROP_ON`). `reorder` makes the sheet's rows
  movable: a drag lands the row at the line (`DROP_LINE`) between two rows and the sheet scrolls near
  its edges, and the keyboard and the more menu move it ([without a pointer](drag.md#without-a-pointer)).
  A flat sheet reorders; a tree or a grouped one does not. The mechanics are in [drag](drag.md).

## Rows

A row is one box on the sheet whatever it holds, with one form everywhere (`ROW`, `ROW_TEXT`,
`ROW_END`, flex groups): a flex group of a leading region, a text group and an end group. Each
platform sets the direction and the centring, which are overlays. A chosen option is ticked or
checked, never washed.

### Text group and end group

- The **text group** (`ROW_TEXT`) is the title or label over its description or facts line, a
  column that grows and may be cut (`min-w-0`), giving way to the end group below its own content,
  so its text wraps or truncates inside the space the end group leaves. Its title line and the meta
  line under it stand a `badge` apart. On the web it is one class list per form, `textGroup`, and no
  list holds a class another class in it overrides.
- The **end group** (`ROW_END`) is what stands at the row's end, a line centred on the row, its parts
  an inside apart, in one order: the trailing value (cut to the space the rest leave), a `switch`, a
  `pick`, the `act` (an icon act, its label the accessible name and the tooltip; the row's other
  acts are its `more`), the copy act, the `more` act and a tree's fold. An age, a count and a control
  stand whole, a control taking the text group's floor. A row with nothing at its end draws no end
  group, so nothing reserves space for one; the space that holds an alignment is a group's gap or
  padding, never an empty element ([roster](roster.md)).
- The text group keeps at least two fifths of the row's content width, the Pane head's floor (a
  fraction, never a width), whatever else stands in the row (a leading, a more act). The end group
  takes what is left and its value truncates inside it.

### Who gives way first

Who gives way first when a line is out of space is a flex shrink weight, and the weights stand in one
order, first to last: the text that may be cut (`YIELDS_FIRST`, 10^7); the named local weights (a
file row's count lanes 10^5 and its directory 10^4, a row end's state 100 before its age, a form
label's 3); the default 1 (a name, a chip, a control's text); then what gives only when nothing else
can (`YIELDS_LAST`, 0.0001, a non-wrapping badge line's badges before its last one). A weight is read
off this scale, never a number written beside a class. A text group with no floor to keep gives way
first, so the end group keeps its space; a group with a floor (`ROW_TEXT_FLOOR`) stands at it and gives
way at the default weight, since its end group is the one that truncates; a group whose words stay
whole never shrinks.

### Title and facts

- The title is words (truncated unless `wrap`), a `{ code }` (cut in its middle; with `copy` the mono
  with a copy act), `{ absent }` (meta ink) or a status (`{ tone, label? }`, its mark and word at the
  title's start, plain).
- The facts line is led by the row's marks: the status's dot and word, a warning, a lock, a Chip, the
  boolean marks (the required ring, a flag), each its glyph and its word, then the words, wrapping
  whole. The status, warning, Chip, marks and words are the row's `facts`, one list
  (`facts: Fact[]`: a status, `{ warning }`, a chip, a boolean mark, words) in the order given; the
  `lock` is its own prop. The marks among the facts fold, never cut. A boolean mark whose words are
  not drawn (`{ flag, label, words: false }`) is a glyph in the end group named by its label, no
  mark of the facts line. A sentence is no fact but the row's `line`, text under the title and the
  badges that wraps whole.
- The facts' words follow the title on its line, cut at the end of the line, and stand under it on
  touch (with a mark, `entry`, `steps` or `wrap`) or below the row's one-line width (`rowOneLine`, a
  container query of the row, never a measure of its content; [Overflow rules](#overflow-rules)). On touch a
  two-line row without a label, an entry or `steps` stands its end group on the title's line, the
  facts line under both at the row's width.
- In the two-line form a title wraps before it is cut, to `ROW_TITLE_LINES` lines
  ([Overflow rules](#overflow-rules)). A title that wraps keeps its longest word whole in every form: its text
  group is as wide as its minimum content (`break-words` makes the word, not a letter, the minimum),
  held to the row by `max-w-full`, and never shrinks; it grows into spare space. So the end group,
  which truncates, gives way first, and a word wider than the row breaks at the row's edge, never
  past it.
- `wrap` reads a title whole: words wrap, a `{ code }` run in them wraps inside its box, and a
  `{ code, copy: true }` stands whole on as many lines as it needs, breaking anywhere (a fingerprint
  has no spaces). Without `wrap`, a one-word `{ code }` of more than eight characters too long for its
  space cuts in its middle (`valueCut`).
- A definition value too long for its row is cut by `valueCut` in `list-state.ts`: the stem gives way
  from its end (an ellipsis after it) and the tail, its last `VALUE_TAIL` characters, never does, so
  the start and the end of a long identifier stay (`SHA256:uNiV…k3Qz`). Only a value of one word
  longer than twice the tail is cut: a value with a space is words (`No history yet`), which read from
  their start, and a shorter one has no middle to give. Both stay one stem, so no space ends a node
  and no word is split in two. Each platform draws the stem truncating to its own box, so the row
  measures the space it gives; the two parts together are the whole value, which stays the accessible
  text and the copy payload. Both platforms read the same cut.
- A file row is one line: the path cut as text by the component to the space its chip leaves, each
  count in its own lane, the change mark in a lane before the glyph, at most one Chip between the path
  and the counts.
- `title`, `facts`, `line`, a `switch`'s `checked` and a `pick`'s `options` and `value` are data: a
  selection paints in its place, the row inert, while its read waits, and the row is the frame of the
  selections it draws ([reads](reads.md#frames)).

### Leading

- A row's leading is a glyph, a status's mark (`{ tone }`: its dot, or the spinner while `running`;
  its `label`, when given, names the dot and is not drawn), a person's avatar, a tick that chooses the
  row, or a type's mark. An avatar, a glyph, a mark or a tick stands in one region at the avatar's size;
  a status takes its own mark's space.
- A `leading` of `check` is the row's tick, a checkbox named by the title; its `blocked` reason, the
  reason the row cannot be ticked, draws it disabled and leads the facts' words.
- A `leading` of `mark` is a type's mark (`ROW_MARK`, one or two characters in the family's hue); its
  `label` names it (accessible name and tooltip), else it is decorative.
- A row's change state is `change?: ChangeKind`. The `change` mark stands in a lane one icon wide ahead of the `leading` mark, glyph only, the kind's
  word its name; a set's untouched rows are `unchanged`, so the titles line up.

### Definition rows

- A `label` puts the row in the sheet's two columns (`DEFINITION_BOX`, a subgrid of `ROWS`): the label
  at the body role in the meta ink (a `{ code }` label in the code role) in the first, in a column as
  wide as the widest label of the Pane ([Rows grid](#rows-grid)), the line in the second. A row
  without a label starts its text group at the row's start.
- A definition row stands its value under its label on touch (`touch:`) and in a Pane too narrow for
  a label and a value side by side at the short measure (`definitions-stacked:`,
  `definitionsOneRow`; [Overflow rules](#overflow-rules)). On the web each `definitions-stacked:` class of the
  definition row family is the twin of a `touch:` class in ui-core's variants, as `TEXT_ADAPTS` is
  `TEXT_WORDS`'s, and the form field uses the same twins.
- A form's controls show their placeholder or value whole: a long label makes the label column wide,
  and the Pane stands the value under its label where it cannot hold both, so no input and no pick
  cuts what it shows. A toggle has no value to stand under its name, so it keeps its name's line at
  every width. The showcase's Form scene logs an error where a control is cut or a toggle falls under
  its name or off its name's line.

### Touch rows

- Below `tablet` an act stands under the row's text and a lock shows its glyph alone; a row inside a
  wide sheet on the desktop stands in no page.
- A touch row says some values with their column's label (`Staging: Passing`, `Observed: usd`): a
  value whose kind stands in more than one column of the row, since each is ambiguous among the
  others. Statuses are one kind, words (`text`, `source`, a column with no kind) another. A number
  always carries its label, a chip its own mark, a change says what it is, and a lone value of its
  kind is the row's one such fact. The row's first age is its live trailing age and stands outside
  `columns`; an age among them is a further one, which says its label, since "1 day ago" alone is
  ambiguous.
- A touch row's fact holds at most the short measure of characters. A longer value is a sentence,
  said whole in the row's line, which a cut badge would hide and touch cannot hover to read.

### States and other forms

- A `selected` row is the open record, washed as a row at its `href` is. The open row carries the
  current bar (`ROW_CURRENT_BAR`), drawn over its start with no space (a tree's child's at its rail,
  its washes with it), so every row's text and hairline stand at the sheet's inset as a band's do.
- A row that opens (`href` or `onOpen`) draws no chevron: the wash and the pointer say it.
- An `entry` (an Input at the bar fit and its labelled Button) stands under the title in the facts
  line's place, its error under it. The Button's label is never cut: where the Input at the short
  measure and the whole Button do not fit one line, the Button stands under the Input at the line's
  end.
- A `dim` row stands off a highlighted path. `steps` stand in the facts line's place while the row's
  act pends. `progress` is a task's bar (`ROW_PROGRESS`: the meter's track and fill), the last line of
  the text column, a badge gap under the facts.
- One lock mark: the meta glyph and its reason, a link to what holds the fact with an `href`, inert
  without one. A locked row takes no act or open.
- The marks a row draws from its data are the Section's states: a status (its tone's dot beside its
  word, a spinner in the dot's place while `running`, a state chip when it carries its own `label`),
  a chip, an avatar, a glyph, a count and a `more` menu (a popover on the desktop, a sheet on touch).
  Other frames draw the same marks from their own data.

### Trees

- In a tree a row reads its depth and fold from the Section: a rail per level (`TREE_RAIL`, one
  `stack` step), and a branch's fold the bare chevron of the Section's own fold toggle, in the meta
  ink, turning a quarter, never washed open.
- A tree's hairline is the divided sheet's, starting at the rail of the row under it (`--rule-depth`,
  which a tree row sets on itself from the row under it): past the row's inset, less the hairline so
  the line meets the rail's top, and one indent per level. Under a row a root follows, unset, so the
  hairline runs whole.
- On the web a tree is one focus stop: the row is the stop and the hit is the pointer's alone. A row's
  own controls (its tick, pick, act and more menu) stand in the tab order only on the row that holds
  the stop, never one stop per row.

## Rows grid

Every definition list in a Pane reads as one grid, so its labels share one column.

- Every run of rows (a sheet's, a Form's) is one grid of two columns, `ROWS`, which marks itself the
  rows' host (`ROWS_HOST`), so a definition row's label column is as wide as the widest label of the
  run. The grid places each entry across both columns; a definition row alone subgrids them
  (`DEFINITION_BOX`), and a form's group is a run inside the form's (`FORM_GROUP`, a subgrid, so its
  labels align with the rest). These tokens (`ROWS_HOST`, `SUBGRID`) stay in every class list built
  on them whatever a component merges over them, and the walk's grid exceptions name them.
- The two columns are one chain down a Pane. The Pane's body is the head of the chain: its two
  columns (`auto minmax(0,1fr)`) are the label column and the value column of every definition list in
  it. A Section, the Section's body, the sheet and the Form each stand in `ROWS`, their own two
  columns, and a subgrid of the parent's where the parent is a `rows-host`. So every definition list
  in a Pane shares the label column of the widest label among them, and a run standing alone (a
  Sheet's, a Column's) keeps its own.
- A Section is a `ROWS` run of its own, so its head and its body span both columns; in a Pane's body
  (or any `ROWS` that is a grid) it subgrids the parent's two columns instead, and its body and sheet
  subgrid it in turn. A Form is a `ROWS` run of its own columns, or of the columns of the Pane's body
  or Section's body it stands in, its rows a subgrid of them. A `Card` is a run of rows as well: a
  field placed alone in it takes the run's label column, as the facts beside it do, and a part spans
  both columns. A field that fills a line takes the label column of the run it stands in; a toggle, a
  slider and a group of controls keep their name over them.
- A Pane body that fills (a Thread or a Canvas with `fill`, or the Pane's failed, missing and empty
  shapes) takes the free height by plain flex, the body's height being definite. Grid rows cannot hand
  one child the free height, so that body is a flex column and carries no `ROWS`.
- The label column is as wide as the widest label, no wider than one short measure: a longer label
  wraps at its words. A row needs two short measures, so the value column keeps one at least and a
  long label never starves a pick of its words.
- A subgrid draws in its parent's columns, so a cap on each part's box would not bound its rows: the
  body's own columns end at the reading width, a third track taking the rest (`ROWS_MEASURED`).
- Wide content (a Table, a line Diff, a code block, a Canvas, a chart) marks itself `data-wide` and
  spans every track of the run it stands in, and so does each part of the chain that holds it: it
  stands at the body's width, past the reading width's third track, while the rows beside it keep the
  reading width. Content decides it, so no Pane or Section is told.
- The run draws the hairline between its rows once, so no row carries one. A child selector is one
  uniwind drops, so native draws that hairline per row, and the web draws it as an overlay on the run
  (a pseudo-element on each entry but the last, so a rounded row keeps a straight hairline).
- On the phone a Form's fields are a run the form does not index (no component reads its children,
  [structure](../../../packages/ui-core/guide/structure.md#reading)), so they abut with no hairline
  between them, as labelled rows do; the hairline falls between its groups, which are data. A Form's
  group draws a band: the title line over the description.

## Cards

A **card** is the surface inside a hairline edge at the card radius.

- Every part of a Section's body is a card: a sheet's rows stand flush on it, a Form's rows and a
  Table's likewise, and anything else (a Prose, a Stats, a Stages, an Image) stands at the card's
  inset (`CARD_PART`).
- A block a reader reads whole is a card too (Code, Diff: a diff's soft grounds sit on the surface
  wherever it stands), and so are a Message's card and an empty state outside a card.
- The `Card` component is the card for a part that draws none of its own: the surface inside a
  hairline, its `children` at the card's inset. A Section's sheet, a Form, a Table and a Stats are
  cards of their own and never stand in a `Card`, which would be a box in a box. The showcase's usage
  window shows it: its meter is a Stats, a card of its own, and the reserve, a part that is no row,
  stands in a `Card` beside it.

## Overflow rules

`overflow.ts` holds the rules that decide a form from structure, never from a measure of the content.

- **Acts.** One overflow rule, on both platforms and in every place acts stand side by side (a Pane head,
  a list row, an action bar's count): the first act stands, at its icon where it is a head's or a
  row's, and the rest fold into the more menu, in their order. What stands never depends on the space,
  so a head or a row reads the same at every width.
- **A row's one-line form.** The narrowest a row can be for its one-line form (the web's
  `row-two-line:` container variant) is a rule of the row's width: the name and one meta at the
  desktop set's figures (the touch set is the two-line form already), each the short measure (20
  characters, `ROW_TEXT_FLOOR`'s text) in the text group at its floor of two fifths of the row, a gap
  between them; the end group, the rest, holds two short-measure words at the caption size and the
  gap between them. The row is as wide as the wider of the two needs (`rowOneLine`, whose px at the
  default `size` knob `DESIGN.md` prints; the name and meta bind), whatever the device or the viewport. A row in a narrower container
  takes the two-line form rather than cut its meta.
- **Title lines.** A two-line row's title wraps to `ROW_TITLE_LINES` (three) lines before it is cut:
  the title is the row's name, and a name cut at one line leaves it unread. A name that is a sentence
  ("Stopped: the deploy failed its health check") beside an end group of a glyph and an age at 320 is
  two lines and a word, and a cut that takes the word it is about loses more than the line it saves.
  The web's `line-clamp-3` and the phone's `numberOfLines` both read it.
- **Definitions side by side.** The narrowest a Pane can be for its definition rows' side-by-side
  form (the web's `definitions-stacked:` container variant) is a rule of the Pane's width: a label and
  a value, each the short measure (20 characters) at the desktop body size, the `stack` gap between
  them, and the Pane's `page` inset at both sides. A Pane narrower than it stands each value under its
  label, as touch does at every width, rather than leave a pick or an input under its placeholder.
- **Rules lists.** The narrowest a rules list can be for its one-row form (the web's `rules-stacked:`
  container variant) is a rule of the list's width: two terms, each a term's floor of characters at
  the desktop body size in a `bar` pick's box (its inset at both sides, a gap and a control's box for
  its act), the arrow or operator and the remove act at a control's width, and the row's gap between
  the four. A list narrower than it stacks each rule's terms rather than cut a term under its floor.

The consumer-facing side of these rules is in
[voice](../../../packages/ui-core/guide/voice.md).

## Chip runs

The gap between the lines of a wrapped run of chips is the fields gap, wider than the target less
the chip ([sizes](tokens.md#sizes-and-hit-target)), so no remove act's hit slop, which reaches that far past its chip, meets the next
line's. The web draws that gap on touch alone.

## In the code

- `packages/ui-core/src/roster/shell.ts`: the Shell's contract, its groups, places, branches and foot.
- `packages/ui-core/src/roster/gate.ts`: the Gate's contract.
- `packages/ui-core/src/roster/pane.ts`: the Pane's contract, its bar, record head, body, foot and toasts' reach.
- `packages/ui-core/src/roster/sheet.ts`: the sheet's contract.
- `packages/ui-core/src/roster/section.ts`: the Section's contract and the row it lists.
- `packages/ui-core/src/roster/thread.ts`: the Thread's layout and the column class set.
- `packages/ui-core/src/roster/card.ts`: the `Card` contract.
- `packages/ui-core/src/roster/shared.ts`: the card, the rows grid tokens (`ROWS`, `ROWS_HOST`, `SUBGRID`).
- `packages/ui-core/src/roster/descriptors.ts`: a row's leading, `RouteRegistry`.
- `packages/ui-core/src/overflow.ts`: the overflow rule for acts and the container widths of rows, definitions and rules lists.
- `packages/ui-core/src/list-state.ts`: `valueCut`, a touch row's labelled values (`touchNamed`) and fact length (`TOUCH_FACT_FITS`), the counted rows (`listedRows`), the facts-only check (`factsOnly`).
- `packages/ui-core/src/variants.ts`: a row's two groups, the shrink scale, the text group's floor.
- `packages/ui-core/src/tokens.ts`: the docked sheet's body height cap.
- `packages/ui-core/src/chart.ts`: `factReach`, the reach of a record head's acting fact.
- `plugins/react-ui/src/ui/components/shell/index.tsx`: the web Shell, the sidebar's runs.
- `plugins/react-ui/src/ui/components/shell/panes.tsx`: the web Panes, its widths, counts, the page's `h1`.
- `plugins/react-ui/src/ui/components/pane/index.tsx`: the web Pane, its body, foot and record timeline.
- `plugins/react-ui/src/ui/components/pane/head.tsx`: a record's way back, the bar name's wait.
- `plugins/react-ui/src/ui/components/item-header/base.tsx`: the record name's view timeline.
- `plugins/react-ui/src/ui/components/section/index.tsx`: the web Section's subgrid.
- `plugins/react-ui/src/ui/atoms/section/card.tsx`: a tree's hairline.
- `plugins/react-ui/src/ui/components/row/index.tsx`: the web row, its text group, wrapping and tree focus.
- `plugins/react-ui/src/ui/components/form/base.tsx`: the web Form's run of rows.
- `plugins/react-ui/src/ui/components/form-field/index.tsx`: a field's place in the label column.
- `plugins/react-ui/src/ui/components/card/index.tsx`: the web `Card` as a run of rows.
- `plugins/react-ui/src/ui/lib/container.ts`: the container context on the web.
- `plugins/react-ui/src/ui/lib/heading.ts`: the heading level a Section reads.
- `plugins/native-ui/src/ui/components/shell/index.tsx`: the phone Shell.
- `plugins/native-ui/src/ui/components/shell/panes.tsx`: the phone Panes.
- `plugins/native-ui/src/ui/components/gate/index.tsx`: the phone Gate.
- `plugins/native-ui/src/ui/components/form/base.tsx`: the phone Form's rows.
- `plugins/native-ui/src/ui/lib/container.ts`: the container context on the phone.
- `plugins/native-ui/src/ui/lib/hosts.tsx`: the keyboard-aware scroll pane.
- `plugins/native-ui/src/ui/lib/chip-lines.ts`: the gap between a chip run's lines.
- `apps/showcase/src/roster/scenes/`: the scenes that judge a heading, a Pane bar, a Form's controls and the toasts' reach (`pane.tsx`, `form.tsx`, `toast.tsx`, `section.tsx`, `section-rows.ts`, `card.tsx`).
