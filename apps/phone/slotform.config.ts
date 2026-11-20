import { api } from "@slotform/api";
import { auth } from "@slotform/auth";
import { defineConfig } from "@slotform/cli";
import { cloudflare } from "@slotform/cloudflare";
import { db } from "@slotform/db";
import { expo } from "@slotform/expo";
import { nativeUi } from "@slotform/native-ui";
import { query } from "@slotform/query";

export default defineConfig({
	app: {
		name: "phone",
		domain: "example.com",
	},
	plugins: [
		// Background playback and the lock screen's controls come from expo-audio's
		// config plugin, which the app that plays adds itself.
		expo({
			configPlugins: [
				{
					name: "expo-audio",
					options: { microphonePermission: false, recordAudioAndroid: false },
				},
			],
		}),
		api(),
		query(),
		db({
			dialect: "d1",
			databaseId: "YOUR_D1_DATABASE_ID",
		}),
		auth({
			cookies: {
				prefix: "phone",
			},
			organization: false,
			expo: true,
		}),
		nativeUi(),
		cloudflare(),
	],
});
