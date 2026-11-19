import { type ButtonAct, PRESS_WASH } from "@fcalell/ui-core/variants";
import type { ComponentProps } from "react";
import type { Closed } from "../../lib/closed.ts";

// The press a public Button maps from `onAct`, or the props a Base UI trigger
// hands through its `render` (a popup's trigger): never a style channel.
export type Handed = Omit<ComponentProps<"button">, keyof Closed | "children">;

export const BOX =
	"relative inline-flex items-center justify-center max-w-full min-w-0";
export const LABEL = "truncate";

export const PRESS: Record<ButtonAct, string> = {
	primary: "hover:bg-act-accent-hover active:bg-act-accent-press",
	danger: "hover:bg-act-danger-hover active:bg-act-danger-press",
	secondary: PRESS_WASH,
	destructive: PRESS_WASH,
	quiet: PRESS_WASH,
};

export const BLOCKED: Record<ButtonAct, string> = {
	primary: "aria-disabled:bg-fill-disabled aria-disabled:text-ink-meta",
	danger: "aria-disabled:bg-fill-disabled aria-disabled:text-ink-meta",
	secondary: "aria-disabled:text-ink-disabled",
	destructive: "aria-disabled:text-ink-disabled",
	quiet: "aria-disabled:text-ink-disabled",
};

// Pending, the act's content fades out and its spinner in once `--act-delay`
// has run (`globals.css`).
export const FADE_OUT = "opacity-0 animate-act-out";
export const FADE_IN = "animate-act-in";
