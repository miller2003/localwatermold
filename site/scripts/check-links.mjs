// Internal link check: every href="/..." in dist must resolve to a built file.
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const DIST = process.argv[2] || "dist/site";
function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith(".html") ? [p] : [];
  });
}
// Answered by the Worker (worker/), not built files.
const WORKER_PATHS = ["/.well-known", "/mcp", "/auth.md", "/oauth", "/agent", "/api/v1/health"];
function resolves(href) {
  const path = href.split("#")[0].split("?")[0];
  if (WORKER_PATHS.some((w) => path === w || path.startsWith(`${w}/`))) return true;
  if (!path || path === "/") return existsSync(join(DIST, "index.html"));
  const p = join(DIST, path);
  if (existsSync(p) && statSync(p).isFile()) return true;
  return existsSync(join(p, "index.html"));
}

const broken = new Map();
let count = 0;
for (const file of walk(DIST)) {
  const html = readFileSync(file, "utf8");
  for (const m of html.matchAll(/href="(\/[^"]*)"/g)) {
    count++;
    if (!resolves(m[1])) broken.set(m[1], (broken.get(m[1]) ?? new Set()).add(file.replace(/\\/g, "/")));
  }
}
console.log(`Internal links checked: ${count}. Broken targets: ${broken.size}.`);
for (const [href, files] of broken) console.error(`  ${href}  <- ${[...files].slice(0, 3).join(", ")}${files.size > 3 ? ` (+${files.size - 3})` : ""}`);
if (broken.size) process.exit(1);
