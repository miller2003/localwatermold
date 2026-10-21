import type { APIRoute } from "astro";
import { SITE } from "../../src/config";

export const GET: APIRoute = ({ site }) => {
  const body =
    SITE.launchMode === "live"
      ? `User-agent: *\nAllow: /\n\nSitemap: ${new URL("/sitemap.xml", site).href}\n`
      : `# Preview build: keep crawlers out until launch.\nUser-agent: *\nDisallow: /\n`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
