// Usage: node scripts/build.mjs <state|all> [--deploy]
// Builds the root section (home, about, legal) and one state section, or every state that has
// site data, then merges them into dist/site: root pages at /, each state under /<state-slug>/.
// Runs the similarity check per state, then the link and SEO checks on the merged site, and writes
// llms-full.txt. --deploy pushes the Worker.
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, readdirSync, rmSync } from "node:fs";
import { stateSlug } from "../astro.config.mjs";

const arg = (process.argv[2] || "").toLowerCase();
if (!arg) {
  console.error("Usage: node scripts/build.mjs <state|all> [--deploy]   e.g. oh, pa, all");
  process.exit(1);
}
const ready = readdirSync("src/data").filter((d) => existsSync(`src/data/${d}/counties.json`));
const states = arg === "all" ? ready : [arg];
const failed = [];
const run = (cmd, args, env = {}) =>
  spawnSync(cmd, args, { stdio: "inherit", env: { ...process.env, ...env }, shell: process.platform === "win32" }).status === 0;

rmSync("dist", { recursive: true, force: true });
console.log("\n=== root ===");
if (!run("npx", ["astro", "build", "--silent"], { SITE_STATE: "us" })) {
  console.error("Root section failed to build.");
  process.exit(1);
}
cpSync("dist/sections/us", "dist/site", { recursive: true });

for (const state of states) {
  if (!ready.includes(state)) {
    console.error(`[${state}] no site data yet. Run: python pipeline/derive.py --state ${state}`);
    failed.push(state);
    continue;
  }
  console.log(`\n=== ${state} ===`);
  const slug = stateSlug(state);
  const ok =
    run("npx", ["astro", "build", "--silent"], { SITE_STATE: state }) &&
    run("node", ["scripts/check-similarity.mjs", `dist/sections/${state}/counties`]);
  if (ok) cpSync(`dist/sections/${state}`, `dist/site/${slug}`, { recursive: true });
  else failed.push(state);
}

console.log(`\nBuilt ${states.length - failed.length} of ${states.length} states.${failed.length ? ` Failed: ${failed.join(", ")}` : ""}`);
const linksOk = run("node", ["scripts/check-links.mjs", "dist/site"]);
const seoOk = run("node", ["scripts/check-seo.mjs", "dist/site"]);
run("node", ["scripts/llms-full.mjs", "dist/site"]);
if (failed.length || !linksOk || !seoOk) process.exit(1);
if (process.argv.includes("--deploy") && !run("npx", ["wrangler", "deploy"])) process.exit(1);
