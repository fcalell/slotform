// Record-scoped authorization and the statement compile: a typed wrapper over CASL's `MongoAbility`.
// Access control: docs/architecture/plugins/auth.md, "Access control".
import type {
	AnyMongoAbility,
	ForcedSubject,
	MongoAbility,
	MongoQuery,
	RawRuleOf,
} from "@casl/ability";
import {
	AbilityBuilder,
	subject as caslSubject,
	createMongoAbility,
} from "@casl/ability";
import { type PackRule, packRules, unpackRules } from "@casl/ability/extra";
import { ORPCError } from "@orpc/server";

// ---------- Subject vocabulary ----------

// Instance-checked subjects declare the row fields their conditions may
// read (e.g. `{ Expense: { paidById: string } }`). An abstract (string-only)
// subject maps to `never` — the bottom type is assignable to any field
// record, so `never` satisfies this constraint while making conditions on
// that subject impossible to type (see `ConditionsTail` below).
export type AbilitySubjects = Record<string, Record<string, unknown>>;

// The subject union CASL's ability actually checks against: an abstract
// subject stays a bare string; an instance subject is either the bare
// string (unconditional grants, e.g. `can("read", "Report")`) or a row
// tagged via `subject(name, row)` (see `ForcedSubject`).
type SubjectUnion<Subjects extends AbilitySubjects> = {
	[K in keyof Subjects & string]: [Subjects[K]] extends [never]
		? K
		: K | (Subjects[K] & ForcedSubject<K>);
}[keyof Subjects & string];

export type AbilityFor<
	Subjects extends AbilitySubjects,
	Actions extends string = string,
> = MongoAbility<[Actions, SubjectUnion<Subjects>]>;

// Optional 3rd argument to `can`/`cannot`: a `MongoQuery` over the subject's
// declared fields for an instance subject, or an empty tuple (no argument
// accepted) for an abstract one — passing conditions there is a type error.
type ConditionsTail<Fields> = [Fields] extends [never]
	? []
	: [conditions?: MongoQuery<Fields>];

type CanFn<Subjects extends AbilitySubjects, Actions extends string> = <
	K extends keyof Subjects & string,
>(
	action: Actions,
	subjectType: K,
	...conditions: ConditionsTail<Subjects[K]>
) => void;

// ---------- defineAbility ----------

export function defineAbility<
	Subjects extends AbilitySubjects,
	Actions extends string = string,
>(): {
	can: CanFn<Subjects, Actions>;
	cannot: CanFn<Subjects, Actions>;
	build: () => AbilityFor<Subjects, Actions>;
} {
	const builder = new AbilityBuilder<AbilityFor<Subjects, Actions>>(
		createMongoAbility,
	);
	return {
		// The builder's real `can`/`cannot` already do the right thing at
		// runtime (push `{ action, subject, conditions }`); only the static
		// type narrows here, to the simpler action+subject+conditions shape
		// this module commits to (no per-field rules).
		can: builder.can as unknown as CanFn<Subjects, Actions>,
		cannot: builder.cannot as unknown as CanFn<Subjects, Actions>,
		build: () => builder.build(),
	};
}

// Row tagging for instance checks: `subject("Expense", row)` marks `row` as
// an `Expense` so `ability.can("update", subject("Expense", row))` matches
// the rules declared for that subject type.
export function subject<
	Fields extends Record<string, unknown>,
	TSubjectType extends string,
>(
	subjectType: TSubjectType,
	row: Fields,
): Fields & ForcedSubject<TSubjectType> {
	return caslSubject(subjectType, row);
}

// ---------- assertCan ----------

// `opts.cloak` is for a consumer's own procedures, which `guide/abilities.md`
// documents; the framework passes no option.
export function assertCan<TAbility extends AnyMongoAbility>(
	ability: TAbility,
	action: Parameters<TAbility["can"]>[0],
	subjectArg: Parameters<TAbility["can"]>[1],
	opts?: { cloak?: boolean; message?: string },
): void {
	if (ability.can(action, subjectArg)) return;
	// `message` is the denial copy the client renders, so a consumer whose UI
	// is not in English can pass its own. Cloaked denials ignore it: their
	// whole point is to be indistinguishable from a missing record.
	if (opts?.cloak) {
		throw new ORPCError("NOT_FOUND");
	}
	throw new ORPCError("FORBIDDEN", {
		message: opts?.message ?? "Insufficient permissions",
	});
}

// ---------- pack / unpack ----------

// Wire format of packed rules: docs/architecture/plugins/auth.md, "Ability wire format".
export type PackedRules<TAbility extends AnyMongoAbility = AnyMongoAbility> =
	PackRule<TAbility["rules"][number]>[];

type PackedConditions = Record<string, unknown> | 0 | undefined;

// Packed rules written out for any subject: docs/architecture/plugins/auth.md, "Ability wire format".
export type PackedRule =
	| [string, string]
	| [string, string, PackedConditions]
	| [string, string, PackedConditions, 1]
	| [string, string, PackedConditions, 1 | 0, string]
	| [string, string, PackedConditions, 1 | 0, string | 0, string];

export type PackedRuleSet = PackedRule[];

export function packAbility<TAbility extends AnyMongoAbility>(
	ability: TAbility,
): PackedRules<TAbility> {
	return packRules(ability.rules) as PackedRules<TAbility>;
}

export function unpackAbility<TAbility extends AnyMongoAbility>(
	packed: PackedRules<TAbility>,
): TAbility {
	// `TAbility["rules"][number]` and `RawRuleOf<TAbility>` are the same type
	// once TAbility resolves, but tsc can't reduce the indexed access while
	// the generic is open; one cast bridges it.
	return createMongoAbility<TAbility>(
		unpackRules(packed) as RawRuleOf<TAbility>[],
	);
}

// ---------- compileStatements ----------

// Statements compile one way into CASL rules: docs/architecture/plugins/auth.md, "Access control".
const FORBIDDEN_ACTION = "manage";
const FORBIDDEN_SUBJECT = "all";

export function compileStatements(
	grants: Record<string, readonly string[]>,
): { action: string; subject: string }[] {
	const rules: { action: string; subject: string }[] = [];
	for (const [resource, actions] of Object.entries(grants)) {
		if (resource === FORBIDDEN_SUBJECT) {
			throw new Error(
				`compileStatements: resource "${FORBIDDEN_SUBJECT}" is a CASL wildcard subject (matches every subject), but better-auth statements treat it as a literal resource name. Compiling it would over-grant client-side — use a specific resource name instead.`,
			);
		}
		for (const action of actions) {
			if (action === FORBIDDEN_ACTION) {
				throw new Error(
					`compileStatements: action "${FORBIDDEN_ACTION}" is a CASL wildcard action (matches every action), but better-auth statements treat it as a literal action name. Compiling it would over-grant client-side — use a specific action name instead.`,
				);
			}
			rules.push({ action, subject: resource });
		}
	}
	return rules;
}
