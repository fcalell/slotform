import assert from "node:assert/strict";
import { test } from "node:test";
import type { CodegenExpoConfigPayload } from "../types.ts";
import { aggregateExpoConfig } from "./codegen.ts";

function render(over: Partial<CodegenExpoConfigPayload> = {}): string {
	return aggregateExpoConfig({
		name: "Acme",
		slug: "acme",
		scheme: "acme",
		bundleIdentifier: "app.acme",
		androidPackage: "app.acme",
		appStoreId: undefined,
		plugins: [],
		...over,
	});
}

test("the App Store URL is written from the App Store id", () => {
	assert.match(
		render({ appStoreId: 1385361527 }),
		/appStoreUrl: "https:\/\/apps\.apple\.com\/app\/id1385361527",/,
	);
});

test("with no App Store id the app config holds no App Store URL", () => {
	assert.doesNotMatch(render(), /appStoreUrl/);
});

test("the Play Store URL is written from the Android package", () => {
	assert.match(
		render(),
		/playStoreUrl: "https:\/\/play\.google\.com\/store\/apps\/details\?id=app\.acme",/,
	);
});
