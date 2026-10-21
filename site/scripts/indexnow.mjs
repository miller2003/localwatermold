// Usage: node scripts/indexnow.mjs
// Submits every URL in the built sitemaps (dist/site) to IndexNow, which shares them with Bing,
// Yandex, Seznam and other participating engines. The key file lives in public/<key>.txt.
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const HOST = "localwatermold.com";
const DIST = "dist/site";
const key = readdirSync("public").find((f) => /^[0-9a-f]{32}\.txt$/.test(f))?.replace(".txt", "");
if (!key) throw new Error("No IndexNow key file (public/<32 hex>.txt).");

function sitemaps(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? sitemaps(p) : f.startsWith("sitemap") && f.endsWith(".xml") ? [p] : [];
  });
}
const urls = [...new Set(sitemaps(DIST).flatMap((f) => [...readFileSync(f, "utf8").matchAll(/<url><loc>([^<]+)<\/loc>/g)].map((m) => m[1])))];
if (!existsSync(join(DIST, `${key}.txt`))) throw new Error("Key file isn't in the build. Rebuild and deploy first.");

for (let i = 0; i < urls.length; i += 10000) {
  const urlList = urls.slice(i, i + 10000);
  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: HOST, key, keyLocation: `https://${HOST}/${key}.txt`, urlList }),
  });
  console.log(`IndexNow: ${urlList.length} URLs -> HTTP ${res.status} ${await res.text()}`);
}
