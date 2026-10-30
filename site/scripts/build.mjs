// Usage: node scripts/build.mjs <state|all> [--deploy]
// Builds the root section (home, about, legal) and one state section, or every state that has
// site data, then merges them into dist/site: root pages at /, each state under /<state-slug>/.
// Runs the similarity check per state, writes index.md beside every page and llms-full.txt, then runs
// the link and SEO checks on the merged site. --deploy pushes the Worker (only after a full, passing "all" build).
// States build in parallel, BUILD_JOBS at a time (default: half the CPU cores, at most 6).
import { spawn, spawnSync } from "node:child_process";
import { cpSync, existsSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { availableParallelism } from "node:os";
import { stateSlug } from "../astro.config.mjs";

const arg = (process.argv[2] || "").toLowerCase();
if (!arg) {
  console.error("Usage: node scripts/build.mjs <state|all> [--deploy]   e.g. oh, pa, all");
  process.exit(1);
}
const ready = readdirSync("src/data").filter((d) => existsSync(`src/data/${d}/counties.json`));
const states = arg === "all" ? ready : [arg];
const jobs = Math.max(1, Number(process.env.BUILD_JOBS) || Math.min(6, Math.floor(availableParallelism() / 2)));
const failed = [];
const started = Date.now();
const secs = (t) => `${((Date.now() - t) / 1000).toFixed(0)}s`;
const shell = process.platform === "win32";
const run = (cmd, args, env = {}) =>
  spawnSync(cmd, args, { stdio: "inherit", env: { ...process.env, ...env }, shell }).status === 0;
// Same as run(), but buffers output so parallel builds print as whole blocks, not interleaved lines.
const runQuiet = (cmd, args, env = {}) => new Promise((resolve) => {
  const child = spawn(cmd, args, { env: { ...process.env, ...env }, shell });
  let out = "";
  child.stdout.on("data", (d) => (out += d));
  child.stderr.on("data", (d) => (out += d));
  child.on("close", (code) => resolve({ ok: code === 0, out }));
});

rmSync("dist", { recursive: true, force: true });
run("node", ["scripts/county-redirects.mjs"]);
console.log("\n=== root ===");
if (!run("npx", ["astro", "build", "--silent"], { SITE_STATE: "us" })) {
  console.error("Root section failed to build.");
  process.exit(1);
}
cpSync("dist/sections/us", "dist/site", { recursive: true });

async function buildState(state) {
  const t = Date.now();
  if (!ready.includes(state)) {
    console.error(`[${state}] no site data yet. Run: python pipeline/derive.py --state ${state}`);
    failed.push(state);
    return;
  }
  const build = await runQuiet("npx", ["astro", "build", "--silent"], { SITE_STATE: state });
  const check = build.ok ? await runQuiet("node", ["scripts/check-similarity.mjs", `dist/sections/${state}/counties`]) : { ok: false, out: "" };
  console.log(`\n=== ${state} (${secs(t)}) ===\n${(build.out + check.out).trim()}`);
  if (build.ok && check.ok) cpSync(`dist/sections/${state}`, `dist/site/${stateSlug(state)}`, { recursive: true });
  else failed.push(state);
}

console.log(`\nBuilding ${states.length} state${states.length > 1 ? "s" : ""}, ${Math.min(jobs, states.length)} at a time.`);
const queue = [...states];
await Promise.all(Array.from({ length: Math.min(jobs, states.length) }, async () => {
  while (queue.length) await buildState(queue.shift());
}));

console.log(`\nBuilt ${states.length - failed.length} of ${states.length} states in ${secs(started)}.${failed.length ? ` Failed: ${failed.join(", ")}` : ""}`);
run("node", ["scripts/markdown.mjs", "dist/site"]);
run("node", ["scripts/llms-full.mjs", "dist/site"]);
const linksOk = run("node", ["scripts/check-links.mjs", "dist/site"]);
const seoOk = run("node", ["scripts/check-seo.mjs", "dist/site"]);
if (failed.length || !linksOk || !seoOk) process.exit(1);
// Marks dist/site as a complete, checked build. scripts/deploy.mjs refuses to upload without it, so a
// one-state build can't replace the live site and take the other states down. Kept outside dist/site
// so it isn't uploaded.
if (arg === "all") writeFileSync("dist/build-info.json", JSON.stringify({ builtAt: new Date().toISOString(), states }, null, 2));
console.log(`Total build time: ${secs(started)}.`);
if (process.argv.includes("--deploy") && !run("node", ["scripts/deploy.mjs"])) process.exit(1);
