import { ApiError } from "@fcalell/plugin-api/error";
import { type ReactNode, useEffect, useRef } from "react";
import type { AppRouter } from "../../../.stack/worker";

// The fixtures the scenes of a form over `forms.submit` share.

// The input of the showcase's `forms.submit` procedure: a form over it derives
// every control.
export type Request = AppRouter["forms"]["submit"]["__input"];

// `forms.submit` as the client hands it, running `run` in place of the wire.
function procedure(run: () => Promise<{ id: string }>) {
	const key = [["forms", "submit"], { type: "mutation" }] as const;
	return {
		call: (_input: Request) => run(),
		mutationKey: () => key,
		mutationOptions: () => ({ mutationKey: key, mutationFn: () => run() }),
	};
}
export const NEVER = procedure(() => new Promise<{ id: string }>(() => {}));

// `forms.submit` refused by the server's schema: each issue stands under the field its path names.
export function refusing(
	issues: { path: (keyof Request)[]; message: string }[],
) {
	return procedure(() =>
		Promise.reject(new ApiError("BAD_REQUEST", { data: { issues } })),
	);
}

export const SAVED = procedure(() => Promise.resolve({ id: "request-1" }));

const KINDS = [
	{ value: "change", label: "A change" },
	{ value: "measurement", label: "A measurement" },
	{ value: "question", label: "A question" },
] as const;

export const KIND = { label: "Kind of request", options: KINDS };

// What a request holds once it is filled in: the required fields of
// `forms.submit`.
export const FILLED = {
	title: "Add the checkout event",
	kind: "change",
	seats: 3,
	urgent: false,
} as const;

export const GIVEN = { workspaceId: "acme" };
// Every required key of `forms.submit`, for a form that shows none of them.
export const GIVEN_ALL = { ...GIVEN, ...FILLED };
// Every required key but the kind, for a form that shows its kind pick.
export const GIVEN_BUT_KIND = {
	...GIVEN,
	title: FILLED.title,
	seats: FILLED.seats,
	urgent: FILLED.urgent,
};

// Presses its form's submit act once mounted, so the scene holds what the press leaves: an act that never settles pending, a refusal under its fields.
export function Submitted(props: { children: ReactNode }) {
	const scene = useRef<HTMLDivElement>(null);
	useEffect(() => {
		scene.current
			?.querySelector<HTMLButtonElement>("button[type=submit]")
			?.click();
	}, []);
	return (
		<div ref={scene} className="flex flex-col">
			{props.children}
		</div>
	);
}
