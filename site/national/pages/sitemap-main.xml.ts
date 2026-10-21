import type { APIRoute } from "astro";
import { SITE } from "../../src/config";
import { NATIONAL_GUIDES, REFERENCE_PAGES, guidePath } from "../../src/lib/guides";

const PATHS = [
  "/", ...REFERENCE_PAGES.map((r) => r.path), ...NATIONAL_GUIDES.map((g) => guidePath(g.slug)),
  "/how-it-works/", "/editorial-policy/", "/data-sources/",
];

export const GET: APIRoute = ({ site }) => {
  const urls = PATHS.map((p) => `  <url><loc>${new URL(p, site).href}</loc><lastmod>${SITE.lastReviewed}</lastmod></url>`).join("\n");
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
};
