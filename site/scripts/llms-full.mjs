// Writes dist/site/llms-full.txt: the full text of the national guides and reference pages as
// Markdown, so AI assistants can read every guide in one request. Runs on the merged site.
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const DIST = process.argv[2] || "dist/site";
const SITE = process.env.SITE_URL || "https://localwatermold.com";
// Root /guides/ only holds national guides; state guides live under /<state>/guides/.
const guides = readdirSync(join(DIST, "guides"), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();
const pages = [...guides.map((g) => `/guides/${g}/`), "/glossary/", "/water-damage-statistics/"];

const decode = (s) => s
  .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"')
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)));

function toMarkdown(html) {
  let main = html.match(/<main[^>]*>([\s\S]*?)<\/main>/)?.[1] ?? "";
  main = main
    .replace(/<script[\s\S]*?<\/script>/g, "").replace(/<style[\s\S]*?<\/style>/g, "")
    .replace(/<aside class="side[\s\S]*?<\/aside>/g, "") // sidebar: help box, TOC, related links
    .replace(/<nav[\s\S]*?<\/nav>/g, "")
    .replace(/<p class="small faint byline"[\s\S]*?<\/p>/g, "");
  return decode(main
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/g, "\n# $1\n")
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/g, "\n## $1\n")
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/g, "\n### $1\n")
    .replace(/<summary[^>]*>([\s\S]*?)<\/summary>/g, "\n**$1**\n")
    .replace(/<dt[^>]*>([\s\S]*?)<\/dt>/g, "\n**$1**: ")
    .replace(/<li[^>]*>/g, "\n- ")
    .replace(/<\/t[dh]>/g, " | ").replace(/<tr[^>]*>/g, "\n| ")
    .replace(/<(strong|b)>([\s\S]*?)<\/\1>/g, "**$2**")
    .replace(/<br\s*\/?>/g, "\n")
    .replace(/<\/(p|div|ul|ol|table|section|details|aside|dl|dd)>/g, "\n")
    .replace(/<[^>]+>/g, ""))
    .replace(/[ \t]+/g, " ").replace(/ *\n */g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

const parts = [];
for (const path of pages) {
  const file = join(DIST, path, "index.html");
  if (!existsSync(file)) continue;
  parts.push(`<!-- Source: ${SITE}${path} -->\n${toMarkdown(readFileSync(file, "utf8"))}`);
}
const head = `# Local Water & Mold: full text of the national guides\n\n> Every guide that applies in all states, plus the glossary and state statistics. Each section names its source URL; please cite that URL. Index: ${SITE}/llms.txt\n`;
writeFileSync(join(DIST, "llms-full.txt"), `${head}\n${parts.join("\n\n---\n\n")}\n`);
console.log(`llms-full.txt: ${parts.length} pages.`);
