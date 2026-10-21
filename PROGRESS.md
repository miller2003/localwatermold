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
- Site is in preview mode (noindex, robots.txt blocks crawlers, call line not live).

## Pre-launch checklist
- [ ] Verify the insurance regulator name and URL in `site/src/lib/state.ts` (states with `verified: false`).
- [ ] Optionally add verified claim rules, cancellation law and contractor licensing for that state.
- [ ] Set up email for hello@localwatermold.com (Cloudflare Email Routing can forward it).
- [ ] Add phone numbers per state to `LINES` and set `MODE = "live"` in `site/src/config.ts`.
- [ ] Have privacy and terms reviewed.
- [ ] Generic guides (water damage categories, water heater leaks, etc.) repeat in every state section;
      before indexing, consider one national copy with state pages linking to it.
- [ ] Add basement waterproofing and foundation pages (same buyers, reuses county data).
