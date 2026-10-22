// Writes dist/site/llms-full.txt: the full text of the national guides and reference pages as
// Markdown, so AI assistants can read every guide in one request. Runs on the merged site.
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { toMarkdown } from "./markdown.mjs";

const DIST = process.argv[2] || "dist/site";
const SITE = process.env.SITE_URL || "https://localwatermold.com";
// Root /guides/ only holds national guides; state guides live under /<state>/guides/.
const guides = readdirSync(join(DIST, "guides"), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();
const pages = [...guides.map((g) => `/guides/${g}/`), "/glossary/", "/water-damage-statistics/"];

const parts = [];
for (const path of pages) {
  const file = join(DIST, path, "index.html");
  if (!existsSync(file)) continue;
  parts.push(`<!-- Source: ${SITE}${path} -->\n${toMarkdown(readFileSync(file, "utf8"))}`);
}
const head = `# Local Water & Mold: full text of the national guides\n\n> Every guide that applies in all states, plus the glossary and state statistics. Each section names its source URL; please cite that URL. Index: ${SITE}/llms.txt\n`;
writeFileSync(join(DIST, "llms-full.txt"), `${head}\n${parts.join("\n\n---\n\n")}\n`);
console.log(`llms-full.txt: ${parts.length} pages.`);
