import type { WorkerExport } from "@fcalell/plugin-api/runtime";

// The worker shape this target calls: docs/architecture/plugins/node.md, "Worker contract".
export type NodeWorker = Pick<
	WorkerExport,
	"fetch" | "checkEnv" | "jobContext"
>;
