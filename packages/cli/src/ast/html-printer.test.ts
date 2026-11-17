import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";
import { renderHtml } from "./html-printer.ts";

const RAW = `a & b < c " d`;

async function shell(): Promise<URL> {
	const dir = await mkdtemp(join(tmpdir(), "html-printer-"));
	const path = join(dir, "index.html");
	await writeFile(
		path,
		`<!doctype html>\n<html lang="en"><head></head><body><p>x &amp; y</p></body></html>\n`,
	);
	return pathToFileURL(path);
}

test('attribute and text values holding &, < and " print escaped once', async () => {
	const html = await renderHtml({
		shellSource: await shell(),
		head: [
			{ kind: "html-attr", name: "data-x", value: RAW },
			{ kind: "title", value: RAW },
			{ kind: "meta", name: "description", content: RAW },
			{ kind: "link", rel: "icon", href: `/i.svg?a=1&b="2"` },
		],
		bodyEnd: [{ kind: "script", src: "/m.js?a=1&b=2", type: "module" }],
	});
	assert.equal(
		html,
		`<!doctype html>\n<html lang="en" data-x="a &amp; b &lt; c &quot; d"><head>` +
			`<title>a &amp; b &lt; c " d</title>` +
			`<meta name="description" content="a &amp; b &lt; c &quot; d">` +
			`<link rel="icon" href="/i.svg?a=1&amp;b=&quot;2&quot;">` +
			`</head><body><p>x &amp; y</p>` +
			`<script src="/m.js?a=1&amp;b=2" type="module"></script>` +
			`</body></html>\n`,
	);
});
