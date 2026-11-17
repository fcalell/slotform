# Codegen

How the CLI and the plugins turn resolved slots into files: the AST and its printers, the trust
boundaries every interpolated value crosses (HTML and CSS), the import merge, path containment, and
the rules `stack generate` applies when it writes an artifact. Which slot renders which file is in
[consumer project](./consumer-project.md#project-structure); the order `generate` runs in is in
[commands](./commands.md#command-procedures).

## The AST and its printers

`@fcalell/cli/ast` holds the spec types for generated TypeScript and TSX (`TsSourceFile`,
`TsStatement`, `TsExpression`, `TsImportSpec`, `TsTypeRef`, `TsJsxExpression`), TOML
(`TomlDocument`, `TomlValue`) and HTML (`HtmlDocument`, `HtmlInjection`), with one printer each:
`renderTsSourceFile`, `renderToml`, `renderHtml`. A plugin builds the `TsExpression` discriminated
union directly. The one authoring helper is `literalToProps`: it turns a record of plain values
from `stack.config.ts` options into a key-to-`TsExpression` map in insertion order, the shape of
`PluginRuntimeEntry.options`, so a plugin seeds from `ctx.options` and then sets single keys
(`rt.options.trustedOrigins = …`). A plain object, array or JSON primitive converts; a `Date`,
`Map`, `Set`, class instance, function, `bigint` or `symbol` throws a `TypeError`, and the caller
builds a structured `TsExpression` for it.

### Printer loading

ts-morph prints the TypeScript `generate` writes, and only there. It is an optional peer of the
CLI, which the app declares as a devDependency (`stack init` writes it), so an install that only
runs the app, with no `stack`, holds none of it. It loads when the first file is printed, never
when the CLI starts, so `stack init` runs from a directory that has none yet; a missing ts-morph
fails that first print with the `pnpm add -D ts-morph` it needs.

## Import merge

Plugins emit the import statements of a `.stack/*.ts` file independently, and `dedupeImports`
merges them into one well-formed import line per source. It keys each named import by its local
name: `named: ["foo"]` binds `foo` to `foo`, `named: [{ name: "bar", alias: "foo" }]` binds `foo` to
`bar`. Two contributions binding one local name to different exports are a hard conflict and
throw, so a disagreement between plugins surfaces as an error instead of wrong code at runtime.

## HTML printer trust boundary

The HTML printer is the trust boundary for codegen output. Every value that reaches it (titles,
descriptions, `html-attr` values) flows from `stack.config.ts`, which reads from any source the
consumer wires up, so it is treated as attacker-controlled. The policy follows the OWASP HTML5
Security Cheat Sheet and the WHATWG escape rules:

- **Attribute values** encode `&`, `<`, `>`, `"` and `'`. Attributes are always double-quoted, and
  encoding both quote forms keeps the output safe under either quote style.
- **Text content** of normal elements encodes `&`, `<` and `>`; quotes are not special in body
  context.
- **RCDATA text** (`<title>`, `<textarea>`) encodes `&`, `<` and `>`. Only `&` and the matching close
  tag are special there; the wider set parses identically and holds if node-html-parser's
  serializer changes.

No value round-trips through a serializer that might decode it: node-html-parser's
`TextNode.toString()` returns `rawText` as-is, so the printer stores text already escaped.

## CSS escape boundary

Plugins assemble CSS as strings: `@font-face`, `:root` and `@theme` token blocks, `@import` and
`@source` statements, `@layer` blocks. Every interpolation that crosses the consumer trust boundary
(font and family names, URLs, layer and token names, supports expressions) goes through the helpers
of `@fcalell/cli/css`, so a hostile or careless input cannot break out of its CSS context. The
boundary lives in that one module so a hardening reaches every caller. The helpers are pure ASCII
string functions with no runtime dependencies; their `label` argument only names the offending
plugin in the error.

| Helper | Crosses |
|--------|---------|
| `cssString` | a CSS `<string>` |
| `cssUrl` | a URL |
| `cssIdent` | an `<ident>`: a family name, a layer or token name |
| `cssVarName` | a custom-property name: `--radius-md`, the Tailwind v4 modifier form `--text-h1--line-height`, a namespace reset `--color-*` |
| `cssTokenValue` | a custom-property or declaration value, unquoted; refuses `;`, `{`, `}`, line breaks, comment delimiters and unbalanced parentheses |
| `cssSupportsExpression` | an `@supports` or `supports(...)` argument; refuses `;`, `{`, `}` and unbalanced parentheses, and renders the rest verbatim |

Parentheses are checked per value because a pair fails silently. A single unbalanced value fails
the CSS parser loudly, but an unclosed `calc(` in one declaration and a stray `)` in a later one fuse
every declaration between them into one, and the stylesheet builds clean with the whole block gone.
Each half is well-formed alone, so nothing downstream catches it.

Each UI plugin wraps the helpers in a thin layer that only stamps its own label into the error
(`plugins/react-ui/src/node/css-escape.ts`, `plugins/native-ui/src/node/css.ts`). react-ui's layer
adds `cssProperty` for a declaration's property name: `@theme` carries only custom properties, but a
`@utility` body and the mode block carry plain properties (`box-shadow`, `color-scheme`), which are
`<ident>`s, and both spellings cross the same boundary. A plugin contributing a token block to
`appCssLayers`, whose content passes through untouched, builds it with react-ui's `renderRule`,
whose declarations cross the same boundary and whose selector is the contributing plugin's own
constant, never an input.

The slot and option schemas reject a malformed contribution on entry, and both stylesheet renderers
validate again at render: a value that reaches a renderer invalid is a bug in the contributing
plugin or config, and it fails loudly instead of emitting corrupt CSS.

- **`.stack/app.css`** (react-ui) is the `@import` statements, the `@source` declarations, the
  top-level `@theme`, `@utility` and `@custom-variant` blocks, then the `@layer` blocks. The split
  is the cascade: `@theme` compiles into `@layer theme`, which Tailwind sorts before `base`, so a
  `@layer base` block overrides a seeded token. With no contribution there is no file.
- **The uniwind entry stylesheet** (native-ui) is `@import 'tailwindcss'` and `@import 'uniwind'`,
  the `@source` scan roots, one `@theme` (resets, scales, families, colors), three
  `@utility shadow-<level>`, `@utility tabular-nums`, then
  `@layer theme { :root { @variant light|dark { … } } }` for the color overrides. Every name and
  value crosses through `cssVarName`, `cssIdent` and `cssTokenValue`.

## Path containment

A contributed path (`removeFiles`, an artifact's `path`) is written or deleted, so `insideProject`
resolves it against the project root and refuses, with `PATH_OUTSIDE_PROJECT`, one that is the root
itself or lies outside it: a `..` segment or an absolute path never reaches the filesystem.

## Artifact emit

`stack generate` collects every `cliSlots.artifactFiles` contribution and applies three rules at
the write boundary:

- **One trailing newline.** Every artifact ends with exactly one; renderers emit raw content and
  the rule is applied once, here.
- **One content per path.** Two contributions with identical content for one path are one file
  (several `emitArtifact` helpers can resolve to the same string). Different content for one path
  throws, naming the path: the winner would depend on resolver order, so the conflict is fixed at
  the contribution site.
- **Atomic and skip-unchanged.** `writeArtifact` (`@fcalell/cli/write-artifact`) leaves a file whose
  content is already on disk alone (mtime and inode kept, so no watcher fires) and writes a changed
  one whole to a sibling temporary file renamed over the target, which swaps it in one step. A
  process watching the file under `stack dev` (wrangler on `.stack/wrangler.toml`, Vite on
  `.stack/vite.config.ts`) never reads it empty or half-written. A plain `writeFile` truncates the
  target first, and wrangler reading its config in that window exits with "Missing entry-point" and
  is not restarted ([commands](./commands.md#stack-dev)).

## Tracked generated files

A generated file tracked in the consumer's tree, outside `.stack/` (plugin-node's barrel is one),
lands in the shape the formatter already agrees with, or every `stack generate` dirties it until the
next format pass. Biome keeps an array inline while it fits its line width and otherwise breaks it
one entry per line with a trailing comma; the width is 80, Biome's default, which
`@fcalell/biome-config` keeps.

## In the code

- `packages/cli/src/ast/specs.ts`: the TS, TOML and HTML spec types.
- `packages/cli/src/ast/build.ts`: `literalToProps`.
- `packages/cli/src/ast/ts-printer.ts`: `renderTsSourceFile` and the lazy ts-morph load.
- `packages/cli/src/ast/toml-printer.ts`: `renderToml`.
- `packages/cli/src/ast/html-printer.ts`: `renderHtml` and its escape policy.
- `packages/cli/src/ast/imports.ts`: `dedupeImports`.
- `packages/cli/src/css.ts`: the CSS escape and validation helpers.
- `packages/cli/src/lib/inside-project.ts`: `insideProject`.
- `packages/cli/src/lib/write-artifact.ts`: `writeArtifact`.
- `packages/cli/src/commands/generate.ts`: the artifact collapse and newline rule.
- `plugins/react-ui/src/node/codegen.ts`, `plugins/react-ui/src/node/css-escape.ts`: the
  `.stack/app.css` renderer and its label layer.
- `plugins/native-ui/src/node/codegen.ts`, `plugins/native-ui/src/node/css.ts`: the uniwind
  stylesheet renderer and its label layer.
- `plugins/node/src/node/barrel.ts`: the tracked barrel.
