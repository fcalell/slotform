import { posix } from "node:path";
import {
	dedupeImports,
	renderTsSourceFile,
	type TsExpression,
	type TsImportSpec,
	type TsSourceFile,
} from "@fcalell/cli/ast";
import type { ViteConfigValues } from "../types.ts";

// Renders a Vite config module from the resolved `vite.slots.*` values: docs/architecture/plugins/vite.md, "How it works".
export function renderViteConfig(values: ViteConfigValues): string {
	const imports: TsImportSpec[] = dedupeImports([
		{ source: "node:url", named: ["fileURLToPath"] },
		{
			source: "vite",
			named:
				values.fsAllow.length > 0
					? ["defineConfig", "searchForWorkspaceRoot"]
					: ["defineConfig"],
		},
		...values.configImports,
	]);

	const configProps: Array<{
		key: string;
		value: TsExpression;
		shorthand?: boolean;
	}> = [
		{
			key: "root",
			value: {
				kind: "call",
				callee: { kind: "identifier", name: "fileURLToPath" },
				args: [
					{
						kind: "new",
						callee: { kind: "identifier", name: "URL" },
						args: [
							{ kind: "string", value: "." },
							{
								kind: "member",
								object: { kind: "identifier", name: "import.meta" },
								property: "url",
							},
						],
					},
				],
			},
		},
		{ key: "publicDir", value: { kind: "string", value: "../public" } },
		{
			key: "build",
			value: {
				kind: "object",
				properties: [
					{
						key: "outDir",
						value: { kind: "string", value: posix.join("..", values.outDir) },
					},
					{ key: "emptyOutDir", value: { kind: "boolean", value: true } },
				],
			},
		},
		{
			key: "plugins",
			value: { kind: "array", items: values.pluginCalls },
		},
	];

	const serverProps: Array<{ key: string; value: TsExpression }> = [];
	if (values.devServerPort > 0) {
		serverProps.push({
			key: "port",
			value: { kind: "number", value: values.devServerPort },
		});
	}
	if (values.serverProxy.length > 0) {
		serverProps.push({
			key: "proxy",
			value: {
				kind: "object",
				properties: values.serverProxy.map((entry) => ({
					key: entry.path,
					value: {
						kind: "object",
						properties: [
							{
								key: "target",
								value: { kind: "string", value: entry.target },
							},
							...(entry.ws
								? [
										{
											key: "ws" as const,
											value: { kind: "boolean" as const, value: true },
										},
									]
								: []),
						],
					},
				})),
			},
		});
	}
	const headerNames = Object.keys(values.clientHeaders).sort();
	if (headerNames.length > 0) {
		serverProps.push({
			key: "headers",
			value: {
				kind: "object",
				properties: headerNames.map((name) => ({
					key: name,
					value: {
						kind: "string",
						// `name` is a key just read from the object; the index read types it possibly undefined.
						value: values.clientHeaders[name] as string,
					},
				})),
			},
		});
	}
	if (values.fsAllow.length > 0) {
		serverProps.push({
			key: "fs",
			value: {
				kind: "object",
				properties: [
					{
						key: "allow",
						value: {
							kind: "array",
							items: [
								{
									kind: "call",
									callee: {
										kind: "identifier",
										name: "searchForWorkspaceRoot",
									},
									args: [
										{
											kind: "call",
											callee: {
												kind: "member",
												object: { kind: "identifier", name: "process" },
												property: "cwd",
											},
											args: [],
										},
									],
								},
								...values.fsAllow,
							],
						},
					},
				],
			},
		});
	}
	const watchIgnored = [...new Set(values.watchIgnored)];
	if (watchIgnored.length > 0) {
		serverProps.push({
			key: "watch",
			value: {
				kind: "object",
				properties: [
					{
						key: "ignored",
						value: {
							kind: "array",
							items: watchIgnored.map((glob) => ({
								kind: "string",
								value: glob,
							})),
						},
					},
				],
			},
		});
	}
	if (serverProps.length > 0) {
		configProps.push({
			key: "server",
			value: { kind: "object", properties: serverProps },
		});
	}

	const resolveProps: Array<{ key: string; value: TsExpression }> = [];
	if (values.resolveAliases.length > 0) {
		resolveProps.push({
			key: "alias",
			value: {
				kind: "object",
				properties: values.resolveAliases.map((a) => ({
					key: a.find,
					value: { kind: "string", value: a.replacement },
				})),
			},
		});
	}
	const dedupe = [...new Set(values.resolveDedupe)];
	if (dedupe.length > 0) {
		resolveProps.push({
			key: "dedupe",
			value: {
				kind: "array",
				items: dedupe.map((specifier) => ({
					kind: "string",
					value: specifier,
				})),
			},
		});
	}
	if (resolveProps.length > 0) {
		configProps.push({
			key: "resolve",
			value: { kind: "object", properties: resolveProps },
		});
	}
	// `.tsx` optimizer extension: docs/architecture/plugins/vite.md, "Singletons and the optimizer".
	const exclude = [...new Set(values.optimizeExclude)];
	configProps.push({
		key: "optimizeDeps",
		value: {
			kind: "object",
			properties: [
				{
					key: "extensions",
					value: { kind: "array", items: [{ kind: "string", value: ".tsx" }] },
				},
				...(exclude.length > 0
					? [
							{
								key: "exclude",
								value: {
									kind: "array" as const,
									items: exclude.map((name) => ({
										kind: "string" as const,
										value: name,
									})),
								},
							},
						]
					: []),
			],
		},
	});

	const spec: TsSourceFile = {
		imports,
		statements: [
			{
				kind: "export-default",
				value: {
					kind: "call",
					callee: { kind: "identifier", name: "defineConfig" },
					args: [{ kind: "object", properties: configProps }],
				},
			},
		],
	};

	const rendered = renderTsSourceFile(spec);
	return rendered;
}
