// Wire contract for the client version gate, shared between
// `src/worker/version-gate.ts` (Cloudflare Worker) and
// `src/client/index.ts` (React Native client). Neither of those directories
// may import the other (see the node/worker/client split in
// `docs/architecture/conventions.md`), so the two header names live here,
// outside both.
export const CLIENT_BUILD_HEADER = "x-stack-client-build";
export const CLIENT_PLATFORM_HEADER = "x-stack-client-platform";

// The Analytics Engine binding the gate writes its walled / header-less
// counters to: the worker reads it by this name and the node side binds it.
export const VERSION_GATE_METRICS_BINDING = "VERSION_GATE_METRICS";
