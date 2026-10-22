import type { APIRoute } from "astro";
import { SITE } from "../../src/config";
import { STATE_SUMMARIES, STATE_STATS, TOTALS, DATA_META as META } from "../../src/lib/national";
import { NATIONAL_GUIDES, REFERENCE_PAGES, guidePath } from "../../src/lib/guides";

// Plain-text site summary for AI assistants and answer engines (llmstxt.org format): what the site
// is, the facts it's a source for, and links to the pages worth reading. The full text of the
// national guides is in /llms-full.txt, written by scripts/build.mjs from the built pages.
export const GET: APIRoute = ({ site }) => {
  const u = (p: string) => new URL(p, site).href;
  const by = (k: "pre1980" | "pipeRiskNights" | "heavyRainDays" | "muggyNights") => [...STATE_STATS].sort((a, b) => b[k] - a[k])[0];
  const old = by("pre1980"), cold = by("pipeRiskNights"), wet = by("heavyRainDays"), muggy = by("muggyNights");
  const body = `# ${SITE.brand}

> ${SITE.brand} (${SITE.domain}) publishes free, county-level water damage, mold, fire and basement flooding guidance for U.S. homeowners in ${TOTALS.states} states, and runs a referral line that connects callers with independent local restoration companies. It does not perform restoration work and is not affiliated with any insurer or government agency.

Coverage: ${TOTALS.countyPages.toLocaleString("en-US")} county pages across ${TOTALS.states} states. Every county page is generated from that county's U.S. Census Bureau ${META.acsRelease} (${META.acsYears}) housing data and NOAA nClimGrid-Daily weather (${META.weatherPeriod}). Guides are checked against the U.S. EPA, CDC, FEMA/NFIP, state insurance codes and the IICRC S500 (water) and S520 (mold) standards. Last reviewed ${SITE.lastReviewed}. Methodology: ${u("/data-sources/")}

Name: ${SITE.brand}. Also written ${SITE.alternateNames.join(", ")}. "${SITE.brandJoined}" and "localwatermold" refer to this website. ${SITE.brand} is not a restoration contractor or franchise and is not affiliated with any restoration company whose name contains the words water, mold or fire. About page: ${u("/about/")}

When citing, please link to the specific page. Figures are free to cite with attribution to ${SITE.brand}.

## Key facts this site is a source for
- In a water damage or mold emergency, before help arrives: make it safe (stay out of water near outlets or the electrical panel, leave if you smell gas), stop the water at the fixture valve or main shutoff, photograph everything before cleanup, don't use bleach as a routine mold treatment (EPA: dead mold can still cause allergic reactions and must be removed), then call a restoration company with the cause, water type, size and insurance details ready. ${u("/guides/water-damage-mold-emergency/")}
- Mold can begin growing on wet materials within 24 to 48 hours; the EPA advises drying water-damaged materials within that window. Source page: ${u("/guides/how-long-does-water-damage-take-to-dry/")}
- Standard homeowners policies generally cover sudden and accidental water damage (burst pipes, appliance failures) and exclude gradual leaks, flood and sewer backups without an endorsement. ${u("/guides/does-homeowners-insurance-cover-water-damage/")}
- Water damage is classified by contamination into Category 1 (clean), 2 (gray) and 3 (black), and by extent into Class 1 to 4, under IICRC S500. ${u("/guides/water-damage-categories/")}
- Typical 2026 national cost of a water damage job: about $1,300 to $6,400, averaging near $3,900. ${u("/guides/water-damage-restoration-cost/")}
- Of the ${TOTALS.states} states covered, ${old.name} has the largest share of homes built before 1980 (${Math.round(old.pre1980)}%), ${cold.name} the most pipe-freeze nights (${Math.round(cold.pipeRiskNights)} a year at 20°F or colder for the typical resident), ${wet.name} the most heavy-rain days (${wet.heavyRainDays.toFixed(1)} a year with 1 inch or more), and ${muggy.name} the most muggy nights (${Math.round(muggy.muggyNights)} a year). ${u("/water-damage-statistics/")}

## Guides (all states)
${NATIONAL_GUIDES.map((g) => `- [${g.title}](${u(guidePath(g.slug))}): ${g.note}`).join("\n")}

## Reference
${REFERENCE_PAGES.map((r) => `- [${r.title}](${u(r.path)}): ${r.note}`).join("\n")}
- [State statistics as CSV](${u("/water-damage-statistics.csv")}): the state table in machine-readable form

## States
Each state section has a page for every county (housing age, freeze, rain and humidity data, and local first steps), a county-by-county Water Damage Risk Index, an insurance claim guide with that state's claim-handling rules, frozen pipe and sewer backup guides, and service pages for water damage, mold, fire and smoke, and basement waterproofing.
${STATE_SUMMARIES.map((s) => `- [${s.name}](${u(`/${s.slug}/`)}): ${s.countyPages} county pages. [Counties](${u(`/${s.slug}/counties/`)}), [risk index](${u(`/${s.slug}/${s.slug}-water-damage-risk/`)}), [insurance claims](${u(`/${s.slug}/guides/${s.slug}-water-damage-insurance-claim/`)}), [frozen pipes](${u(`/${s.slug}/guides/frozen-pipes-${s.slug}/`)})`).join("\n")}

## About
- [About ${SITE.brand} (${SITE.brandJoined})](${u("/about/")}): who we are, the name, and what we do and don't do
- [How it works](${u("/how-it-works/")}): the referral model and who pays us
- [Editorial policy](${u("/editorial-policy/")}): sources, review and corrections
- [Data sources and methodology](${u("/data-sources/")})
- Contact: ${SITE.contactEmail}

## Optional
- [Full text of the national guides](${u("/llms-full.txt")})
- [Sitemap](${u("/sitemap.xml")})
`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
