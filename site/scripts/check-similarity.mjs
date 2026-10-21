// Doorway-page guard. Compares every built county page with every other one using word
// 5-gram Jaccard similarity, two ways:
//   unique  = main content minus blocks marked data-boilerplate (shared widgets like the
//             triage step list, which search engines treat as site template)
//   full    = everything inside <main>
// Fails the build if either maximum is over its limit.
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const DIR = process.argv[2] || "dist/sections/oh/counties";
const LIMIT_UNIQUE = Number(process.env.SIMILARITY_LIMIT ?? 0.4);
const LIMIT_FULL = Number(process.env.SIMILARITY_LIMIT_FULL ?? 0.5);
const N = 5;

if (!existsSync(DIR)) {
  console.error("No dist/counties folder. Run astro build first.");
  process.exit(1);
}

const BOILER = /<(ol|ul|div|p|a|h2|section)\b[^>]*\bdata-boilerplate\b[^>]*>[\s\S]*?<\/\1>/gi;

function words(html, stripBoiler) {
  let main = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i)?.[1] ?? html;
  main = main.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ");
  if (stripBoiler) main = main.replace(BOILER, " ");
  return main
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, " ")
    .toLowerCase()
    .replace(/[^a-z0-9%°.' ]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}
function shingles(w) {
  const s = new Set();
  for (let i = 0; i + N <= w.length; i++) s.add(w.slice(i, i + N).join(" "));
  return s;
}
function jaccard(a, b) {
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

const pages = readdirSync(DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(join(DIR, d.name, "index.html")))
  .map((d) => {
    const html = readFileSync(join(DIR, d.name, "index.html"), "utf8");
    const u = words(html, true);
    return { slug: d.name, unique: shingles(u), full: shingles(words(html, false)), uniqueWords: u.length };
  });

function scan(key) {
  let worst = { score: 0, a: "", b: "" }, total = 0, pairs = 0;
  for (let i = 0; i < pages.length; i++)
    for (let j = i + 1; j < pages.length; j++) {
      const s = jaccard(pages[i][key], pages[j][key]);
      total += s; pairs++;
      if (s > worst.score) worst = { score: s, a: pages[i].slug, b: pages[j].slug };
    }
  return { avg: pairs ? total / pairs : 0, worst };
}
const f = (x) => (x * 100).toFixed(1) + "%";
const u = scan("unique"), full = scan("full");
const minWords = Math.min(...pages.map((p) => p.uniqueWords));
console.log(`County pages: ${pages.length}. Shortest unique main content: ${minWords} words.`);
console.log(`Unique content: avg ${f(u.avg)}, max ${f(u.worst.score)} (${u.worst.a} vs ${u.worst.b}), limit ${f(LIMIT_UNIQUE)}.`);
console.log(`Full main:      avg ${f(full.avg)}, max ${f(full.worst.score)} (${full.worst.a} vs ${full.worst.b}), limit ${f(LIMIT_FULL)}.`);
if (u.worst.score > LIMIT_UNIQUE || full.worst.score > LIMIT_FULL) {
  console.error("Similarity limit exceeded. Make those pages more distinct before deploying.");
  process.exit(1);
}
