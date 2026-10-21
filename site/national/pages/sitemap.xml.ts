import type { APIRoute } from "astro";
import { SITE } from "../../src/config";
import { STATE_SUMMARIES } from "../../src/lib/national";

// Sitemap index: the root pages plus one sitemap per state section.
export const GET: APIRoute = ({ site }) => {
  const maps = ["/sitemap-main.xml", ...STATE_SUMMARIES.map((s) => `/${s.slug}/sitemap.xml`)];
  const body = maps
    .map((m) => `  <sitemap><loc>${new URL(m, site).href}</loc><lastmod>${SITE.lastReviewed}</lastmod></sitemap>`)
    .join("\n");
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</sitemapindex>\n`, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
};
