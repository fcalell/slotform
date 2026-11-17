/**
 * Whether a file of a directory is a module `loadModules` lists, by name without the extension.
 * The one rule `loadModules` and the bundle apply: docs/architecture/plugins/node.md, "Services".
 */
export function isListedModule(file: string): boolean {
	return (
		/\.(ts|mts)$/.test(file) &&
		!/\.d\.m?ts$/.test(file) &&
		!/\.test\.m?ts$/.test(file) &&
		!/^index\.m?ts$/.test(file)
	);
}
