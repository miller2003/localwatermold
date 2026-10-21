import { defineConfig } from "astro/config";
import { readFileSync } from "node:fs";

// One site, built in sections. SITE_STATE=us builds the root pages (home, about, legal) from ./national;
// any other state key builds that state's pages from ./src under /<state-slug>/.
// scripts/build.mjs runs every section and merges them into dist/site.
const state = (process.env.SITE_STATE || "oh").toLowerCase();
const national = state === "us";
const slug = national ? "" : stateSlug(state);
const site = process.env.SITE_URL || "https://localwatermold.com";

export function stateSlug(key) {
  const meta = JSON.parse(readFileSync(new URL(`./src/data/${key}/counties.json`, import.meta.url), "utf8")).meta;
  return String(meta.state).toLowerCase().replace(/\s+/g, "-");
}

export default defineConfig({
  site,
  base: national ? "/" : `/${slug}/`,
  srcDir: national ? "./national" : "./src",
  // Shared static files (favicon, share images, _headers) ship once, with the root section.
  publicDir: national ? "./public" : "./public-none",
  outDir: `./dist/sections/${state}`,
  trailingSlash: "always",
  build: { format: "directory", inlineStylesheets: "always" },
  compressHTML: true,
  prefetch: { prefetchAll: false, defaultStrategy: "hover" },
});
