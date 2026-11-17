import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { isErrno } from "./errno.ts";

// Writes one generated file atomically, leaving an unchanged one alone; returns whether it wrote.
// Atomic, skip-unchanged writes: docs/architecture/codegen.md, "Artifact emit".
export async function writeArtifact(
	absPath: string,
	content: string,
): Promise<boolean> {
	const current = await readFile(absPath, "utf-8").catch((error: unknown) => {
		if (!isErrno(error, "ENOENT", "ENOTDIR")) throw error;
		return null;
	});
	if (current === content) return false;
	await mkdir(dirname(absPath), { recursive: true });
	const temp = join(
		dirname(absPath),
		`.${basename(absPath)}.${process.pid}.tmp`,
	);
	try {
		await writeFile(temp, content);
		await rename(temp, absPath);
	} catch (err) {
		await rm(temp, { force: true });
		throw err;
	}
	return true;
}
