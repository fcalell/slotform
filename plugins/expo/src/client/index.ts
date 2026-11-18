import { createStore } from "@fcalell/ui-core/store";
import * as Application from "expo-application";
import { Platform } from "react-native";
import {
	CLIENT_BUILD_HEADER,
	CLIENT_PLATFORM_HEADER,
} from "../version-gate-shared.ts";

// The build number comes off the native module: docs/architecture/plugins/expo.md, "Version gate".
function currentPlatform(): "ios" | "android" | null {
	return Platform.OS === "ios" || Platform.OS === "android"
		? Platform.OS
		: null;
}

// versionHeaders never throws, the gate fails open: docs/architecture/plugins/expo.md, "Version gate".
function versionHeaders(): Record<string, string> {
	const build = Application.nativeBuildVersion;
	const platform = currentPlatform();
	if (!build || !platform) return {};
	return {
		[CLIENT_BUILD_HEADER]: build,
		[CLIENT_PLATFORM_HEADER]: platform,
	};
}

const updateRequired = createStore(undefined);

// Rendering the update wall (a screen, a modal) is app/native-ui territory;
// this module only carries the signal.
export function onUpdateRequired(cb: () => void): () => void {
	return updateRequired.subscribe(cb);
}

// `input` may already be a `Request` carrying its own headers (the oRPC link
// used by `@fcalell/plugin-api/client` constructs one), so this merges
// rather than replaces, keeping Content-Type and any caller-supplied
// headers intact.
export function createVersionGatedFetch(
	base: typeof fetch = fetch,
): typeof fetch {
	return async (input, init) => {
		const headers = new Headers(
			input instanceof Request ? input.headers : undefined,
		);
		if (init?.headers) {
			for (const [key, value] of new Headers(init.headers)) {
				headers.set(key, value);
			}
		}
		for (const [key, value] of Object.entries(versionHeaders())) {
			headers.set(key, value);
		}
		const response = await base(input, { ...init, headers });
		if (response.status === 426) updateRequired.emit();
		return response;
	};
}
