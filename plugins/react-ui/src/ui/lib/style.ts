import type { CSSProperties } from "react";

/** A style that sets custom properties beside the standard ones, which `CSSProperties` has no key for. Outside the package's exports. */
export type VarStyle = CSSProperties & {
	[custom: `--${string}`]: number | string | undefined;
};
