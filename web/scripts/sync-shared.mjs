/**
 * Copies the repo-root `shared/` package into `src/shared/` so web always runs the
 * same split, balance, category and permission logic as the mobile app.
 *
 * Runs before dev/build/test. When `../shared` is absent (e.g. a deploy that only
 * uploads this folder) it leaves the committed copy untouched.
 */
import { cpSync, existsSync, readdirSync, rmSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const source = resolve(here, "../../shared");
const target = resolve(here, "../src/shared");

if (!existsSync(source)) {
  console.log("[sync-shared] ../shared not found, keeping src/shared as is");
  process.exit(0);
}

const skip = new Set(["package.json", "node_modules"]);

rmSync(target, { recursive: true, force: true });
for (const entry of readdirSync(source)) {
  if (skip.has(entry)) continue;
  const from = join(source, entry);
  cpSync(from, join(target, entry), { recursive: statSync(from).isDirectory() });
}
console.log("[sync-shared] src/shared refreshed from ../shared");
