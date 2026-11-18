import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";
import {
	LABEL_TRACKING_NAME,
	RADIUS_ROLES,
	SIZES,
	SPACING_ROLES,
	TRACKED_ROLES,
	TYPE_ROLES,
	WIDTHS,
} from "./tokens.ts";

// The contract's scales in the merge: docs/architecture/ui-core/tokens.md, "Composing with cn".
const twMerge = extendTailwindMerge({
	extend: {
		theme: {
			text: [...TYPE_ROLES],
			leading: [...TYPE_ROLES],
			tracking: [...TRACKED_ROLES, LABEL_TRACKING_NAME],
			radius: [...RADIUS_ROLES],
			spacing: [...SPACING_ROLES, ...SIZES],
			container: [...WIDTHS],
		},
	},
	override: {
		conflictingClassGroups: { "font-size": ["leading", "tracking"] },
	},
});

// A role composed after a `leading-` or `tracking-` class deletes it: docs/architecture/ui-core/tokens.md, "Composing with cn".
export function cn(...inputs: ClassValue[]): string {
	return twMerge(clsx(inputs));
}
