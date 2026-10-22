// Usage: node scripts/markdown.mjs [dist/site]
// Writes index.md next to every built index.html: the page's main content as Markdown, with a title,
// description and URL header. The Worker (worker/index.ts) serves it to requests that send
// "Accept: text/markdown", and the MCP get_page tool reads it. toMarkdown() is shared with llms-full.mjs.
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const decode = (s) => s
  .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"')
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)));

// The <main> of a built page as Markdown. With `origin`, links become absolute Markdown links;
// without it (llms-full.txt), link text is kept and the URLs dropped.
export function toMarkdown(html, { origin } = {}) {
  let main = html.match(/<main[^>]*>([\s\S]*?)<\/main>/)?.[1] ?? "";
  main = main
    .replace(/<script[\s\S]*?<\/script>/g, "").replace(/<style[\s\S]*?<\/style>/g, "")
    .replace(/<svg[\s\S]*?<\/svg>/g, "").replace(/<template[\s\S]*?<\/template>/g, "")
    .replace(/<aside class="side[\s\S]*?<\/aside>/g, "") // sidebar: help box, TOC, related links
    .replace(/<nav[\s\S]*?<\/nav>/g, "")
    .replace(/<p class="small faint byline"[\s\S]*?<\/p>/g, "");
  if (origin) {
    main = main.replace(/<a\b[^>]*?href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g, (all, href, inner) => {
      const label = inner.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
      if (!label || href.startsWith("#")) return inner;
      const url = /^(https?:|mailto:|tel:)/.test(href) ? href : new URL(decode(href), origin).href;
      return `[${label}](${url})`;
    });
  }
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

const yaml = (s) => JSON.stringify(s); // a JSON string is a valid YAML double-quoted scalar

export function pageMarkdown(html, url) {
  const title = decode(html.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim() ?? "");
  const description = decode(html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? "");
  const origin = new URL(url).origin;
  return `---\ntitle: ${yaml(title)}\ndescription: ${yaml(description)}\nurl: ${url}\n---\n\n${toMarkdown(html, { origin })}\n`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const DIST = process.argv[2] || "dist/site";
  const SITE = process.env.SITE_URL || "https://localwatermold.com";
  const walk = (dir) => readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : f === "index.html" ? [p] : [];
  });
  let n = 0;
  for (const file of walk(DIST)) {
    const rel = relative(DIST, file).split(sep).join("/");
    writeFileSync(file.replace(/index\.html$/, "index.md"), pageMarkdown(readFileSync(file, "utf8"), `${SITE}/${rel.replace(/index\.html$/, "")}`));
    n++;
  }
  console.log(`Markdown: wrote index.md for ${n} pages.`);
}
