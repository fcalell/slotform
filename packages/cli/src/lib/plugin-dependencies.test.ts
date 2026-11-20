import assert from "node:assert/strict";
import {
	mkdirSync,
	mkdtempSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
	appClosureManifests,
	droppedPeers,
	requiredPeers,
} from "./plugin-dependencies.ts";

test("the required third-party peers are derived", () => {
	assert.deepEqual(
		requiredPeers(
			[
				{
					name: "@slotform/db",
					peerDependencies: {
						"drizzle-kit": "^0.31.11",
						"drizzle-orm": "^0.45.4",
						"@slotform/api": "^0.1.0",
					},
					peerDependenciesMeta: { "drizzle-kit": { optional: true } },
				},
			],
			{},
		),
		{ "drizzle-orm": "^0.45.4" },
	);
});

test("an explicit contribution wins over a derived peer", () => {
	assert.deepEqual(
		requiredPeers(
			[
				{
					name: "@slotform/native-ui",
					peerDependencies: { react: "^19.3.0", uniwind: "^1.13.2" },
				},
			],
			{ react: "19.3.0" },
		),
		{ uniwind: "^1.13.2" },
	);
});

test("the first manifest naming a peer gives its range", () => {
	assert.deepEqual(
		requiredPeers(
			[
				{ name: "@slotform/api", peerDependencies: { zod: "^4.6.7" } },
				{ name: "@slotform/db", peerDependencies: { zod: "^4.0.0" } },
			],
			{},
		),
		{ zod: "^4.6.7" },
	);
});

test("a peer goes only when no package left requires it", () => {
	const api = {
		name: "@slotform/api",
		peerDependencies: { "drizzle-orm": "^0.45.4", hono: "^4.13.19" },
	};
	const db = {
		name: "@slotform/db",
		peerDependencies: { "drizzle-orm": "^0.45.4", "drizzle-kit": "^0.31.11" },
		peerDependenciesMeta: { "drizzle-kit": { optional: true } },
	};
	const ui = {
		name: "@slotform/ui-core",
		peerDependencies: { clsx: "^2.1.1", zod: "^4.6.7" },
	};
	assert.deepEqual(droppedPeers([api, db, ui], [api, db]), ["clsx", "zod"]);
	assert.deepEqual(droppedPeers([api, db], [api]), []);
});

// The app names the vite plugin, whose closure is cli, api and vite.
test("the app's closure is read beside the package that depends on each", () => {
	const app = mkdtempSync(join(tmpdir(), "slotform-peers-"));
	const store = join(app, "node_modules/.pnpm/vite/node_modules/@slotform");
	const install = (name: string, peers: Record<string, string>) => {
		mkdirSync(join(store, name), { recursive: true });
		writeFileSync(
			join(store, name, "package.json"),
			JSON.stringify({ name: `@slotform/${name}`, peerDependencies: peers }),
		);
	};
	install("vite", { zod: "^4.6.7" });
	install("api", { hono: "^4.13.19" });
	install("cli", {});
	mkdirSync(join(app, "node_modules/@slotform"));
	symlinkSync(
		join(store, "vite"),
		join(app, "node_modules/@slotform/vite"),
		"dir",
	);
	writeFileSync(
		join(app, "package.json"),
		JSON.stringify({ dependencies: { "@slotform/vite": "^0.1.0" } }),
	);
	try {
		assert.deepEqual(requiredPeers(appClosureManifests(app), {}), {
			hono: "^4.13.19",
			zod: "^4.6.7",
		});
		assert.deepEqual(appClosureManifests(app, ["@slotform/vite"]), []);
	} finally {
		rmSync(app, { recursive: true, force: true });
	}
});
