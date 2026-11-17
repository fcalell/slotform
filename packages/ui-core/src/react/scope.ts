// The route's scope boundary (the registration is `../scope.ts`).
import {
	createContext,
	createElement,
	type ReactNode,
	use,
	useEffect,
	useMemo,
} from "react";
import { registerScope, releaseScope, type ScopeIds } from "../scope.ts";

// The ids of the boundaries above and how many there are: a boundary extends
// them, so a project's scope holds its organization's id, one level deeper.
const ScopeContext = createContext<{ ids: ScopeIds; depth: number }>({
	ids: {},
	depth: 0,
});

// The route's scope, registered with the client for the subtree it renders: docs/architecture/ui-core/reads.md, "Scope ids".
export function ScopeBoundary(props: { ids: ScopeIds; children?: ReactNode }) {
	const outer = use(ScopeContext);
	const { ids: own } = props;
	const ids = useMemo(() => ({ ...outer.ids, ...own }), [outer, own]);
	const depth = outer.depth + 1;
	registerScope(ids, depth);
	useEffect(() => {
		registerScope(ids, depth);
		return () => releaseScope(ids, outer.ids, outer.depth);
	}, [ids, depth, outer]);
	const value = useMemo(() => ({ ids, depth }), [ids, depth]);
	return createElement(ScopeContext, { value }, props.children);
}
