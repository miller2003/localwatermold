// State pages are built with base "/<state-slug>/" and merged into one site. p() prefixes a
// state-relative path with that base. Site-wide pages (about, legal, national guides) live once at
// the root, so their paths pass through unchanged. The root home page is plain "/", not p("/"),
// and the national guide index is plain "/guides/" (p("/guides/") is the state's own index).
import { NATIONAL_GUIDES, guidePath } from "./guides";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
export const ROOT_PAGES = new Set([
  "/about/", "/how-it-works/", "/editorial-policy/", "/data-sources/", "/privacy/", "/terms/",
  "/glossary/", "/water-damage-statistics/",
  ...NATIONAL_GUIDES.map((g) => guidePath(g.slug)),
]);
export const p = (path: string) => (ROOT_PAGES.has(path) ? path : BASE + path);
