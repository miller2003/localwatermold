# Local Water & Mold: progress

Last update: 2026-10-21

## Scope
One domain, localwatermold.com, for the "water in the house" category cluster: water damage, mold,
fire and smoke, and flooded basements. 25 states as subfolders, in weather-backfill priority order:
OH, PA, MI, IN, KY, WV, TN, MO, IA, WI, NY, IL, MN, NC, VA, AL, MS, AR, OK, KS, NE, GA, SC, MD, TX.
Only counties named "... County" are included (independent cities are skipped).

## Status
- 2026-10-21: merged the 25 per-state sites into one site under localwatermold.com. Brand is
  "Local Water & Mold" (written with "&" so it reads as water damage and mold, not the oomycete
  "water mold"); tagline "Water damage, mold, fire and flooded basement help from local restoration pros".
- All 25 state sections build: 2,285 county pages plus guides, tools and a risk index per state.
- 2026-10-21: switched to live (indexable). Call line still not live (no numbers yet). 2,789 URLs submitted to IndexNow; sitemap index at /sitemap.xml.
- 2026-10-21: content and SEO/GEO pass. Generic guides (categories, water heater, cost) moved to one
  national copy at /guides/ with 301s from the old state URLs; 7 new national guides, a glossary and a
  state statistics page with CSV; basement waterproofing page in every state; answer-first summaries,
  FAQs and FAQPage schema on guides and service pages; richer JSON-LD (WebPage, Article citations,
  Dataset, DefinedTermSet); robots.txt explicitly allows AI crawlers; llms.txt rewritten and
  llms-full.txt generated; build now fails on SEO errors (scripts/check-seo.mjs). Fixed: every state's
  first-hour guide linked to Ohio's insurance regulator; "an Pennsylvania"-style grammar.
- 2026-10-21: new logo, the sign-painter "truck door" wordmark (option 02 of 8). Outlined vector logo in the
  header and footer, red "L" favicon (.ico, .svg, 96px PNG) and app icons, web manifest, 600x600 Organization
  logo, WebSite alternateName for Google's site name, and all 26 share images redrawn in the same style.

## Pre-launch checklist
- [ ] Verify the insurance regulator name and URL in `site/src/lib/state.ts` (states with `verified: false`).
- [ ] Optionally add verified claim rules, cancellation law and contractor licensing for that state.
- [ ] Set up email for hello@localwatermold.com (Cloudflare Email Routing can forward it).
- [ ] Add phone numbers per state to `LINES` and set `MODE = "live"` in `site/src/config.ts`.
- [ ] Have privacy and terms reviewed.
- [x] Generic guides moved to one national copy (see 2026-10-21).
- [x] Basement waterproofing page per state. Foundation repair pages still to do.
- [ ] Cloudflare: add a Redirect Rule from www.localwatermold.com to the apex (canonical tags already
      point at the apex), and check AI Crawl Control / bot settings so AI crawlers aren't blocked at launch.
- [ ] Submit sitemap.xml in Google Search Console and Bing Webmaster Tools at launch (Bing feeds Copilot
      and ChatGPT search).
- [ ] Decide a license for /water-damage-statistics.csv (e.g. CC BY 4.0) and add it to the Dataset schema.
