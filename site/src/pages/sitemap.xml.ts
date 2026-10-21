import { S } from "../lib/state";
import type { APIRoute } from "astro";
import { SITE } from "../config";
import { pilotCounties } from "../lib/data";
import { p } from "../lib/paths";

// State pages only. National guides (lib/guides.ts) are listed once, in the root sitemap.
const STATIC = [
  "/", "/counties/", "/water-damage/", "/mold-remediation/", "/fire-smoke-damage/",
  "/guides/", "/guides/water-damage-first-hour/", `/guides/${S.slug}-water-damage-insurance-claim/`,
  `/guides/frozen-pipes-${S.slug}/`, "/guides/basement-flooding-sump-pump/", "/guides/mold-after-water-damage/",
  `/guides/sewer-backup-${S.slug}/`, "/guides/ice-dams/", "/guides/choosing-restoration-company/",
  "/basement-waterproofing/",
  `/${S.slug}-water-damage-risk/`,
  "/tools/cost-estimator/", "/tools/emergency-checklist/",
];

export const GET: APIRoute = ({ site }) => {
  const paths = [...STATIC, ...pilotCounties().map((c) => `/counties/${c.slug}/`)].map(p);
  const urls = paths
    .map((path) => `  <url><loc>${new URL(path, site).href}</loc><lastmod>${SITE.lastReviewed}</lastmod></url>`)
    .join("\n");
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
};
