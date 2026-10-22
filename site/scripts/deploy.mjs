// Usage: node scripts/deploy.mjs   (npm run deploy:only)
// Uploads dist/site as it is, without rebuilding. Only a full "build all" that passed every check
// writes dist/build-info.json; without it, or if a state is missing, this refuses to deploy, because
// wrangler replaces the whole site and a partial build would take the missing states offline.
// Wrangler only uploads files whose content changed, so a deploy after a small edit is quick.
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { stateSlug } from "../astro.config.mjs";

const fail = (msg) => {
  console.error(`Not deploying: ${msg}\nRun a full build first: npm run build:all`);
  process.exit(1);
};
if (!existsSync("dist/build-info.json")) fail("dist/site isn't from a complete, passing build.");
const info = JSON.parse(readFileSync("dist/build-info.json", "utf8"));
const ready = readdirSync("src/data").filter((d) => existsSync(`src/data/${d}/counties.json`));
const missing = ready.filter((s) => !info.states.includes(s) || !existsSync(`dist/site/${stateSlug(s)}/index.html`));
if (missing.length) fail(`states missing from the build: ${missing.join(", ")}.`);

// Warn (not fail) when source files changed after the build, so a stale build isn't shipped by accident.
const builtAt = new Date(info.builtAt).getTime();
const newer = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const p = `${dir}/${e.name}`;
  return e.isDirectory() ? newer(p) : statSync(p).mtimeMs > builtAt ? [p] : [];
});
const changed = ["src", "national", "public"].filter(existsSync).flatMap(newer);
if (changed.length) console.warn(`Warning: ${changed.length} source file(s) changed since the build at ${info.builtAt}, e.g. ${changed.slice(0, 3).join(", ")}. They won't be in this deploy.`);

console.log(`Deploying the build from ${info.builtAt} (${info.states.length} states).`);
const ok = spawnSync("npx", ["wrangler", "deploy"], { stdio: "inherit", shell: process.platform === "win32" }).status === 0;
process.exit(ok ? 0 : 1);
