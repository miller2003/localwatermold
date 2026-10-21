import type { APIRoute } from "astro";
import { SITE } from "../../src/config";
import { STATE_SUMMARIES, DATA_META as META } from "../../src/lib/national";

// Plain-text site summary for AI assistants and answer engines.
export const GET: APIRoute = ({ site }) => {
  const u = (p: string) => new URL(p, site).href;
  const body = `# ${SITE.brand}

> ${SITE.brand} (${SITE.domain}) publishes county-level water damage, mold, fire and basement flooding guidance for homeowners and runs a referral line that connects callers with independent local restoration companies. It does not perform restoration work.

County data: U.S. Census Bureau ${META.acsRelease} (${META.acsYears}) housing estimates and daily county weather (${META.weatherSource}, ${META.weatherPeriod}). Methodology: ${u("/data-sources/")}

## About
- [How it works](${u("/how-it-works/")}): the referral model and who pays us
- [Editorial policy](${u("/editorial-policy/")})

## States
Each state section has county pages, a water damage risk index, an insurance claim guide and first-steps guides.
${STATE_SUMMARIES.map((s) => `- [${s.name}](${u(`/${s.slug}/`)}): ${s.countyPages} county pages. [Risk index](${u(`/${s.slug}/${s.slug}-water-damage-risk/`)}), [insurance claims](${u(`/${s.slug}/guides/${s.slug}-water-damage-insurance-claim/`)})`).join("\n")}
`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
