import { cn } from "@fcalell/ui-core/cn";
import {
	GATE_LOCKUP,
	GATE_LOGO,
	text,
	textStrong,
} from "@fcalell/ui-core/variants";
import { createContext, type ReactNode, use, useState } from "react";

/** The app's lockup: its icon, in the light mode and, when the app gave one, the dark, and its name; and, when the app drew one, its logo (symbol and name in one image). */
export interface AppLockup {
	/** The icon in the light mode, and in the dark when `dark` is absent. */
	src: string;
	/** The icon in the dark mode. */
	dark?: string;
	/** The app's drawn lockup in the light mode, and in the dark when `logoDark` is absent: drawn in place of the icon and the name. */
	logo?: string;
	/** The drawn lockup in the dark mode. */
	logoDark?: string;
	/** The app's name, drawn beside the icon, and the logo's alternative text. */
	name: string;
}

// The app's lockup: docs/architecture/plugins/react-ui.md, "App lockup".
const LockupContext = createContext<AppLockup | null>(null);

export function LockupProvider(props: {
	lockup: AppLockup | null;
	children: ReactNode;
}) {
	return <LockupContext value={props.lockup}>{props.children}</LockupContext>;
}

export function useLockup(): AppLockup | null {
	return use(LockupContext);
}

const IMAGE = "shrink-0 object-contain";
// A lockup with a dark form draws one logo per mode, each hidden under the
// other's: the theme's own `.dark` scope, not the image's media.
const LIGHT = "[.dark_&]:hidden";
const DARK = "hidden [.dark_&]:block";
// A drawn lockup stands at the row's left, its own proportion kept when the
// row holds it narrower.
const DRAWN = "shrink-0 object-contain object-left";
const ROW = "flex items-center";
const LABEL = "truncate min-w-0";

// A logo that fails to load is gone and the name stands alone: the address
// that failed is kept, so a new `src` is tried again.
function Logo(props: { src: string; className?: string }) {
	const [failed, setFailed] = useState<string>();
	if (props.src === failed) return null;
	return (
		<img
			src={props.src}
			alt=""
			onError={() => setFailed(props.src)}
			className={cn(GATE_LOCKUP, IMAGE, props.className)}
		/>
	);
}

// The drawn lockup carries the app's name as its alt. A pair draws one image
// per mode, the other form hidden, not removed: either failing to load leaves
// the icon and the name.
function Drawn(props: {
	src: string;
	name: string;
	size: string;
	onError: () => void;
	className?: string;
}) {
	return (
		<img
			src={props.src}
			alt={props.name}
			onError={props.onError}
			className={cn(props.size, DRAWN, props.className)}
		/>
	);
}

/** The app's lockup as one row: the drawn lockup when the app has one (at the Gate's `GATE_LOGO` height, its width from its own proportion, held to the row, the app's name as its alt) and otherwise the icon at the avatar's size, then the name at the body role and 500, truncating. A lockup that fails to load leaves the icon and the name. The dark form, when the app has one, is drawn under the theme's own `.dark` scope. The caller reads `useLockup` first and draws no row when the app has no icon. */
export function Lockup(props: { lockup: AppLockup; className: string }) {
	const { lockup } = props;
	const [failed, setFailed] = useState<string>();
	if (
		lockup.logo !== undefined &&
		failed !== lockup.logo &&
		(lockup.logoDark === undefined || failed !== lockup.logoDark)
	) {
		const fail = (src: string) => () => setFailed(src);
		return (
			<div className={cn(props.className, ROW)}>
				{lockup.logoDark === undefined ? (
					<Drawn
						src={lockup.logo}
						name={lockup.name}
						size={GATE_LOGO}
						onError={fail(lockup.logo)}
					/>
				) : (
					<>
						<Drawn
							src={lockup.logo}
							name={lockup.name}
							size={GATE_LOGO}
							onError={fail(lockup.logo)}
							className={LIGHT}
						/>
						<Drawn
							src={lockup.logoDark}
							name={lockup.name}
							size={GATE_LOGO}
							onError={fail(lockup.logoDark)}
							className={DARK}
						/>
					</>
				)}
			</div>
		);
	}
	return (
		<div className={cn(props.className, ROW)}>
			{lockup.dark === undefined ? (
				<Logo src={lockup.src} />
			) : (
				<>
					<Logo src={lockup.src} className={LIGHT} />
					<Logo src={lockup.dark} className={DARK} />
				</>
			)}
			<span
				className={cn(
					text({ role: "body" }),
					textStrong({ role: "body" }),
					LABEL,
				)}
			>
				{lockup.name}
			</span>
		</div>
	);
}
