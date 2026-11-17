/// <reference path="../worker.d.ts" />
import ELK, { type ElkNode } from "elkjs/lib/elk-api.js";
import ElkWorker from "elkjs/lib/elk-worker.min.js?worker";

// The only module that touches the worker: docs/architecture/plugins/react-ui.md, "Canvas serving".
let elk: InstanceType<typeof ELK> | undefined;

export function layoutElk(graph: ElkNode): Promise<ElkNode> {
	elk ??= new ELK({ workerFactory: () => new ElkWorker() });
	return elk.layout(graph);
}
