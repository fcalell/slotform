// A Slotform package's `prepare`, run from the package's directory: `node ../../scripts/prepare.ts`.
// When it builds: docs/architecture/releasing.md, "Prepare script".

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const packing = ["pack", "publish"].includes(process.env.npm_command ?? "");
if (packing && existsSync("dist")) process.exit(0);

const result = spawnSync("pnpm", ["build"], { stdio: "inherit" });
process.exit(result.status ?? 1);
