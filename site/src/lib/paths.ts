// State pages are built with base "/<state-slug>/" and merged into one site. p() prefixes a
// state-relative path with that base. Site-wide pages (about, legal) live once at the root, so
// their paths pass through unchanged. The root home page is plain "/", not p("/").
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const ROOT_PAGES = new Set(["/how-it-works/", "/editorial-policy/", "/data-sources/", "/privacy/", "/terms/"]);
export const p = (path: string) => (ROOT_PAGES.has(path) ? path : BASE + path);
