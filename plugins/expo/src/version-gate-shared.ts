// The wire contract's headers live outside worker/ and client/: docs/architecture/plugins/expo.md, "Version gate".
export const CLIENT_BUILD_HEADER = "x-slotform-client-build";
export const CLIENT_PLATFORM_HEADER = "x-slotform-client-platform";

// The Analytics Engine binding the gate writes its walled / header-less
// counters to: the worker reads it by this name and the node side binds it.
export const VERSION_GATE_METRICS_BINDING = "VERSION_GATE_METRICS";
