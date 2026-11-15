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

// The route's scope, registered with the client for the subtree it renders: every
// call of the binding's query utils under it takes `ids` as its input's scope
// ids (`{ ...ids, ...input }`, an explicit id wins). Put it where the layout
// has resolved the slug: `<ScopeBoundary ids={{ organizationId: organization.id }}>`,
// and under a project `{ projectId: project.id }`, which extends the outer ids.
//
// The registration is set while the boundary renders, because its children read the
// ids in their own render (a query key is built there), before any effect runs;
// it is set again on mount, at the boundary's depth so an outer boundary's effect,
// which runs after the inner's, never puts its own ids over them; on unmount the
// boundary releases its ids and the outer boundary's return.
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
