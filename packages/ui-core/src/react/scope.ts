// The route's scope boundary (the registration is `../scope.ts`).
import {
	createContext,
	createElement,
	type ReactNode,
	use,
	useLayoutEffect,
	useMemo,
	useState,
} from "react";
import { registerScope, releaseScope, type ScopeIds } from "../scope.ts";

// The ids of the boundaries above and how many there are: a boundary extends
// them, so a project's scope holds its organization's id, one level deeper.
const ScopeContext = createContext<{ ids: ScopeIds; depth: number }>({
	ids: {},
	depth: 0,
});

function sameIds(a: ScopeIds, b: ScopeIds): boolean {
	const keys = Object.keys(a);
	return (
		keys.length === Object.keys(b).length &&
		keys.every((key) => a[key] === b[key])
	);
}

// The route's scope, registered with the client for the subtree it renders: docs/architecture/ui-core/reads.md, "Scope ids".
export function ScopeBoundary(props: { ids: ScopeIds; children?: ReactNode }) {
	const outer = use(ScopeContext);
	const merged = { ...outer.ids, ...props.ids };
	// The ids keep their identity while their values hold, so a layout that
	// writes `ids={{ ... }}` inline does not register again on every render.
	const [ids, setIds] = useState(merged);
	if (!sameIds(ids, merged)) setIds(merged);
	const depth = outer.depth + 1;
	// The ids the registration holds: the children render only once their own
	// boundary's ids are committed, so a render that never commits (an
	// interrupted navigation) registers nothing.
	const [shown, setShown] = useState<ScopeIds>();
	useLayoutEffect(() => {
		registerScope(ids, depth);
		setShown(ids);
		return () => releaseScope(ids, outer.ids, outer.depth);
	}, [ids, depth, outer.ids, outer.depth]);
	const value = useMemo(() => ({ ids, depth }), [ids, depth]);
	return shown === ids
		? createElement(ScopeContext, { value }, props.children)
		: null;
}
