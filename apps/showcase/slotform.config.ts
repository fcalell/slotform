import { api } from "@slotform/api";
import { defineConfig } from "@slotform/cli";
import { cloudflare } from "@slotform/cloudflare";
import { query } from "@slotform/query";
import { react } from "@slotform/react";
import { reactUi } from "@slotform/react-ui";
import { screens } from "@slotform/screens";
import { vite } from "@slotform/vite";

export default defineConfig({
	app: { name: "showcase", domain: "showcase.localhost" },
	plugins: [
		vite(),
		react({ title: "Showcase", icon: "/mark.svg" }),
		reactUi(),
		api(),
		query(),
		screens(),
		cloudflare(),
	],
});
