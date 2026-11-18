// The read methods `withRead` (`./read.ts`) adds to every procedure's utils,
// each taking the call's input first; `withScope` (`./scope.ts`) merges the
// scope into that input.
export const READ_KEYS = ["read", "pages", "window"] as const;
export type ReadKey = (typeof READ_KEYS)[number];
