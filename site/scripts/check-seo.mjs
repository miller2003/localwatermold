// On-page SEO check over the merged site. Fails the build on hard errors; prints warnings.
//   errors:   missing or duplicate <title>, missing description or canonical, canonical that doesn't
//             match the page's own URL, not exactly one <h1>, invalid JSON-LD, <img> without alt,
//             duplicate element ids
//   warnings: title over 65 characters, description outside 70 to 165 characters, duplicate descriptions
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const DIST = process.argv[2] || "dist/site";
const SITE = process.env.SITE_URL || "https://localwatermold.com";
const walk = (dir) => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? walk(p) : p.endsWith(".html") ? [p] : [];
});
const decode = (s) => s.replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");

const errors = [], warnings = [];
const titles = new Map(), descs = new Map();
let pages = 0, ldBlocks = 0;
for (const file of walk(DIST)) {
  const rel = relative(DIST, file).split(sep).join("/");
  if (rel === "404.html") continue;
  pages++;
  const html = readFileSync(file, "utf8");
  const url = `${SITE}/${rel.replace(/index\.html$/, "")}`;
  const title = decode(html.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim() ?? "");
  const desc = decode(html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? "");
  const canonical = html.match(/<link rel="canonical" href="([^"]*)"/)?.[1];
  const h1s = (html.match(/<h1[\s>]/g) ?? []).length;

  if (!title) errors.push(`${rel}: no <title>`);
  else {
    titles.set(title, [...(titles.get(title) ?? []), rel]);
    if (title.length > 65) warnings.push(`${rel}: title is ${title.length} chars`);
  }
  if (!desc) errors.push(`${rel}: no meta description`);
  else {
    descs.set(desc, [...(descs.get(desc) ?? []), rel]);
    if (desc.length < 70 || desc.length > 165) warnings.push(`${rel}: description is ${desc.length} chars`);
  }
  if (!canonical) errors.push(`${rel}: no canonical`);
  else if (canonical !== url) errors.push(`${rel}: canonical ${canonical} isn't ${url}`);
  if (h1s !== 1) errors.push(`${rel}: ${h1s} <h1> elements`);
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    ldBlocks++;
    try { JSON.parse(m[1]); } catch (e) { errors.push(`${rel}: invalid JSON-LD (${e.message})`); }
  }
  for (const m of html.matchAll(/<img\b[^>]*>/g)) if (!/\balt=/.test(m[0])) errors.push(`${rel}: <img> without alt`);
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dup.length) errors.push(`${rel}: duplicate ids ${[...new Set(dup)].join(", ")}`);
}
for (const [t, files] of titles) if (files.length > 1) errors.push(`duplicate title "${t}" on ${files.length} pages: ${files.slice(0, 3).join(", ")}`);
const dupDescs = [...descs].filter(([, f]) => f.length > 1);
for (const [d, files] of dupDescs.slice(0, 10)) warnings.push(`duplicate description on ${files.length} pages (${files.slice(0, 2).join(", ")}): "${d.slice(0, 60)}…"`);

console.log(`SEO check: ${pages} pages, ${ldBlocks} JSON-LD blocks. ${errors.length} errors, ${warnings.length} warnings.`);
const show = (list, label, n) => {
  // Group by message shape so 2,000 county pages with the same issue read as one line.
  const groups = new Map();
  for (const m of list) {
    const key = m.replace(/^[^:]+: /, "").replace(/\d+/g, "#");
    groups.set(key, [...(groups.get(key) ?? []), m]);
  }
  for (const [, ms] of [...groups].slice(0, n)) console.log(`  ${label} ${ms[0]}${ms.length > 1 ? ` (+${ms.length - 1} similar)` : ""}`);
};
show(warnings, "warn:", 12);
show(errors, "ERROR:", 30);
if (errors.length) process.exit(1);
