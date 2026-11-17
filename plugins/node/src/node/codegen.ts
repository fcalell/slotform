import {
	dedupeImports,
	renderTsSourceFile,
	type TsExpression,
	type TsImportSpec,
	type TsSourceFile,
} from "@fcalell/cli/ast";
import type { CodegenServerPayload } from "../types.ts";

function moduleUrl(relativePath: string): TsExpression {
	return {
		kind: "new",
		callee: { kind: "identifier", name: "URL" },
		args: [
			{ kind: "string", value: relativePath },
			{
				kind: "member",
				object: { kind: "identifier", name: "import.meta" },
				property: "url",
			},
		],
	};
}

// The generated server entry is a thin call into the runtime: docs/architecture/plugins/node.md, "Generated server entry".
export function aggregateServer(payload: CodegenServerPayload): string {
	const { bundle } = payload;
	const imports: TsImportSpec[] = [
		{ source: "@fcalell/plugin-node/server", named: ["startNodeServer"] },
	];
	// The bundle imports what the source entry loads by URL, so a bundler
	// follows it; "virtual:stack-procedure" is the bundler's alias.
	if (bundle) imports.push(...bundle.imports);
	if (bundle && payload.hasWorker) {
		imports.push({ source: "./worker.ts", default: "worker" });
	}
	if (bundle && payload.hasConsumerServices) {
		imports.push({
			source: "../src/server/services/index.ts",
			namespace: "consumerServices",
		});
	}
	for (const entry of payload.services) {
		imports.push(...entry.imports);
	}

	const properties: Array<{ key: string; value: TsExpression }> = [
		{ key: "port", value: { kind: "number", value: payload.port } },
	];
	if (payload.host !== null) {
		properties.push({
			key: "host",
			value: { kind: "string", value: payload.host },
		});
	}
	properties.push({
		key: "origins",
		value: {
			kind: "array",
			items: payload.origins.map((o) => ({ kind: "string", value: o })),
		},
	});
	const listeners = Object.entries(payload.listeners).sort(([a], [b]) =>
		a < b ? -1 : 1,
	);
	if (listeners.length > 0) {
		properties.push({
			key: "listeners",
			value: {
				kind: "object",
				properties: listeners.map(([name, listener]) => {
					return {
						key: name,
						value: {
							kind: "object",
							properties: [
								{
									key: "port",
									value: { kind: "number", value: listener.port },
								},
								...(listener.host === undefined
									? []
									: [
											{
												key: "host",
												value: {
													kind: "string" as const,
													value: listener.host,
												},
											},
										]),
								{
									key: "originVar",
									value: { kind: "string", value: listener.originVar },
								},
							],
						},
					};
				}),
			},
		});
	}
	properties.push(
		{ key: "maxBody", value: { kind: "number", value: payload.bounds.body } },
		{ key: "maxFrame", value: { kind: "number", value: payload.bounds.frame } },
	);
	if (bundle) {
		properties.push({
			key: "modules",
			value: {
				kind: "object",
				properties: [
					{
						key: "worker",
						value: payload.hasWorker
							? { kind: "identifier", name: "worker" }
							: { kind: "null" },
					},
					{
						key: "services",
						value: payload.hasConsumerServices
							? {
									kind: "member",
									object: { kind: "identifier", name: "consumerServices" },
									property: "services",
								}
							: { kind: "array", items: [] },
					},
				],
			},
		});
	} else {
		properties.push(
			{
				key: "workerModule",
				value: payload.hasWorker
					? moduleUrl(payload.workerFile ?? "./worker.ts")
					: { kind: "null" },
			},
			{
				key: "procedureModule",
				value: payload.hasWorker
					? moduleUrl("./procedure.ts")
					: { kind: "null" },
			},
		);
	}
	if (payload.hasWorker) {
		properties.push({
			key: "workerPaths",
			value: {
				kind: "array",
				items: payload.workerPaths.map((p) => ({
					kind: "string",
					value: p,
				})),
			},
		});
	}
	properties.push({
		key: bundle ? "staticDir" : "staticRoot",
		value:
			payload.staticRoot === null
				? { kind: "null" }
				: bundle
					? moduleUrl(bundle.staticDir ?? "../client")
					: { kind: "string", value: payload.staticRoot },
	});
	const headers = Object.entries(payload.clientHeaders).sort(([a], [b]) =>
		a < b ? -1 : 1,
	);
	if (payload.staticRoot !== null && headers.length > 0) {
		properties.push({
			key: "clientHeaders",
			value: {
				kind: "object",
				properties: headers.map(([name, value]) => ({
					key: name,
					value: { kind: "string", value },
				})),
			},
		});
	}
	if (!bundle) {
		properties.push({
			key: "servicesModule",
			value: payload.hasConsumerServices
				? moduleUrl("../src/server/services/index.ts")
				: { kind: "null" },
		});
	} else if (bundle.boot.length > 0) {
		properties.push({
			key: "boot",
			value: { kind: "array", items: bundle.boot },
		});
	}
	if (payload.services.length > 0) {
		properties.push({
			key: "services",
			value: {
				kind: "array",
				items: payload.services.map((entry) => entry.expression),
			},
		});
	}

	const spec: TsSourceFile = {
		imports: dedupeImports(imports),
		statements: [
			{
				kind: "expression",
				value: {
					kind: "call",
					callee: { kind: "identifier", name: "startNodeServer" },
					args: [{ kind: "object", properties }],
				},
			},
		],
	};

	return renderTsSourceFile(spec);
}
