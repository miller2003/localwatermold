# Local Water & Mold (localwatermold.com)

Water damage, mold, fire and flooded basement help from local restoration pros. A pay-per-call
referral site with county-level guides for 25 states, deployed as one Cloudflare Workers
static-assets Worker (`localwatermold`).

## Site structure
- `/`: national home, plus site-wide pages (`/how-it-works/`, `/editorial-policy/`, `/data-sources/`,
  `/privacy/`, `/terms/`), `robots.txt`, `llms.txt`, `llms-full.txt` and the sitemap index.
- `/guides/<slug>/`: national guides that read the same in every state (roof and appliance leaks, water
  categories, drying times, black mold, crawl spaces, insurance coverage, cost). They're listed in
  `site/src/lib/guides.ts`; state pages link to them with `p()`, which leaves those paths at the root.
- `/glossary/` and `/water-damage-statistics/` (state comparison table, plus `/water-damage-statistics.csv`).
- `/<state-slug>/`: one section per state, e.g. `/ohio/`, `/ohio/counties/wayne-county/`,
  `/ohio/guides/frozen-pipes-ohio/`, `/ohio/ohio-water-damage-risk/`, `/ohio/sitemap.xml`.

Each section is its own Astro build: `SITE_STATE=us` builds the root pages from `site/national/`,
and a state key (`oh`, `pa`, …) builds that state's pages from `site/src/` with base `/<state-slug>/`.
`scripts/build.mjs` builds them all and merges the output into `site/dist/site`.
In state pages, link with `p("/counties/")` from `src/lib/paths.ts` so the state prefix is added;
site-wide pages are linked with plain paths.

States live in `pipeline/states.py` and `site/src/lib/state.ts` (regulators and state law).
OH, PA and MI have verified state-specific law; the other 22 use nationwide-accurate generic text
(FTC Cooling-Off Rule, unfair claims practices) until verified.

## Layout
- `pipeline/`: Python data pipeline. Every script takes `--state xx`. State list: `pipeline/states.py`.
  1. `fetch_census.py`: ACS 2020–2024 + TIGER boundaries via Census Reporter
  2. `fetch_wikidata.py`: county seats
  3. `build_counties.py`: one record per county, plus weather fetch order
  4. `fetch_nclimgrid.py`: NOAA nClimGrid-Daily county averages 2015–2024 (public domain, AWS Open Data)
  5. `derive.py`: writes `site/src/data/<state>/counties.json` and `map.json`
  6. `make_og.py`: writes `site/public/og-<state>.png` (`--national` for `og-us.png`). Run `make_brand.py` first.
- `pipeline/make_brand.py`: the logo set. Converts the sign-painter wordmark (Mr Dafoe script over Alfa Slab One,
  OFL fonts in `pipeline/fonts/`) to outlines and writes `site/src/data/brand.json` (used by `Logo.astro` in the
  header and footer), `logo.svg`/`logo.png` (the Organization logo in JSON-LD), the favicons and app icons.
- `site/`: Astro 5 site
  - `national/pages/`: root pages (home, about, legal, sitemap index, robots, llms.txt)
  - `src/pages/`: state pages
  - `src/config.ts`: brand, tagline, launch mode, phone numbers per state, call hours, reviewer
  - `src/lib/state.ts`: per-state regulator, claim rules, cancellation law, licensing, local programs
  - `src/lib/narrative.ts`: county copy generator (every sentence tied to a county value)
  - `src/lib/risk.ts`: state Water Damage Risk Index
  - `src/lib/guides.ts`: the national guide list (feeds indexes, sitemaps, llms.txt and `p()`)
  - `src/layouts/Article.astro`: guides. Pass `summary` (answer-first bullets) and `faq`; h2s get
    anchor ids and a table of contents automatically, and sources become schema.org citations.
  - `scripts/build.mjs`: build and merge sections, then run the similarity, link and SEO checks
    (`check-seo.mjs`) and write `llms-full.txt` (`llms-full.mjs`)

Counties named "... County" with 2,000+ residents get a page; New York City's boroughs are excluded.

## Common tasks

Rebuild all data from scratch:
```bash
cd pipeline && bash run_all.sh base && bash run_all.sh weather && bash run_all.sh site
```

Build the whole site (root + all states), or the root and one state for a quick check:
```bash
cd site && npm run build:all
```
```bash
cd site && npm run build -- oh
```

Preview the built site locally (same routing as production):
```bash
cd site && npm run preview
```

Deploy (first time: `npx wrangler login`):
```bash
cd site && npm run deploy
```

Go live once a call network has given you numbers: in `site/src/config.ts`, add the state's numbers
to `LINES`, set `MODE` to `"live"`, and have `privacy` and `terms` reviewed.

## Adding a state
1. Add it to `pipeline/states.py` (FIPS code, name, time zone).
2. Run the pipeline steps above with `--state xx`.
3. Add a block to `site/src/lib/state.ts` with that state's insurance regulator, claim-handling rules,
   home solicitation or home improvement cancellation law, and contractor licensing. Verify each fact
   against the statute or the agency's site before publishing.
4. Build and check. The state appears on the home page and in the sitemap automatically.

## Data notes
- U.S. government APIs weren't reachable from the build machine, so Census data comes via Census Reporter
  and FEMA disaster declarations aren't used yet.
- Weather is NOAA nClimGrid-Daily county averages (public domain). It has temperature and precipitation
  only, so snowfall and humidity are replaced by freeze-thaw days and muggy nights (lows of 65°F+).
- `fetch_weather.py` (Open-Meteo) is deprecated: its free endpoint is non-commercial only.
- County land area comes from TIGER; Wikidata area includes water and has errors, so it isn't used.
