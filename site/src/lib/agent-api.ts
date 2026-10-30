// The read-only JSON API for AI agents and developers, built with the national section into
// /api/v1/ (national/pages/api/v1/). The Worker's MCP server (worker/mcp.ts) answers its tools from
// these same files, and /developers/ documents them. Keep field names stable: agents depend on them.
import { SITE, lineFor, callLineLive, formatPhone } from "../config";
import { STATE_SUMMARIES, countiesOf, DATA_META } from "./national";
import { NATIONAL_GUIDES, REFERENCE_PAGES, guidePath } from "./guides";

export const API_VERSION = "1.0.0";
export const API_BASE = "/api/v1";

interface CountyRow {
  name: string; slug: string; seat?: string; fips: string; pilot: boolean;
  population: number; housingUnits: number; medianYearBuilt: number; builtPre1980Pct: number; ownerPct: number;
  places?: { name: string }[];
  weather?: Record<string, number | string>;
}

function helpLine(stateKey: string, countySlug?: string) {
  const line = lineFor(stateKey);
  const phone = (countySlug && line.phones.byCounty[countySlug]) || line.phones.default;
  const live = callLineLive(line) && !!phone;
  return {
    live,
    phone: live ? phone : null,
    display: live ? formatPhone(phone!) : null,
    hours: (countySlug && line.hours.byCounty[countySlug]) || line.hours.default,
    note: live
      ? "Connects to a participating local restoration company. No obligation to hire."
      : "The referral line for this area isn't live yet. The county page still has the local guidance and first steps.",
  };
}

export const stateRecords = (origin: string) => STATE_SUMMARIES.map((s) => ({
  key: s.key,
  abbr: s.abbr,
  name: s.name,
  slug: s.slug,
  url: `${origin}/${s.slug}/`,
  countiesUrl: `${origin}/${s.slug}/counties/`,
  riskIndexUrl: `${origin}/${s.slug}/${s.slug}-water-damage-risk/`,
  insuranceClaimGuideUrl: `${origin}/${s.slug}/guides/${s.slug}-water-damage-insurance-claim/`,
  api: `${origin}${API_BASE}/states/${s.slug}.json`,
  countyPages: s.countyPages,
  insuranceRegulator: { name: s.regulator.name, phone: s.regulator.phone ?? null, url: s.regulator.url },
  helpLine: helpLine(s.key),
}));

export const countyRecords = (origin: string, key: string, stateSlug: string) =>
  (countiesOf(key) as unknown as CountyRow[]).filter((c) => c.pilot).map((c) => {
    const w = c.weather ?? {};
    return {
      name: c.name,
      slug: c.slug,
      fips: c.fips,
      seat: c.seat ?? null,
      url: `${origin}/${stateSlug}/counties/${c.slug}/`,
      places: (c.places ?? []).slice(0, 6).map((p) => p.name),
      population: c.population,
      housingUnits: c.housingUnits,
      medianYearBuilt: c.medianYearBuilt,
      builtBefore1980Pct: c.builtPre1980Pct,
      ownerOccupiedPct: c.ownerPct,
      weather: {
        period: w.period ?? null,
        pipeRiskNightsPerYear: w.pipeRiskNights ?? null,
        freezeNightsPerYear: w.freezeNights ?? null,
        heavyRainDaysPerYear: w.heavyRainDays ?? null,
        muggyNightsPerYear: w.muggyNights ?? null,
        annualPrecipInches: w.annualPrecip ?? null,
        averageFirstFreeze: w.avgFirstFreeze ?? null,
        averageLastFreeze: w.avgLastFreeze ?? null,
      },
      helpLine: helpLine(key, c.slug),
    };
  });

export const guideRecords = (origin: string) => ({
  national: NATIONAL_GUIDES.map((g) => ({ slug: g.slug, title: g.title, summary: g.note, topic: g.group, url: `${origin}${guidePath(g.slug)}` })),
  reference: REFERENCE_PAGES.map((r) => ({ title: r.title, summary: r.note, url: `${origin}${r.path}` })),
  // Guides every state section has. Replace {state} with a state slug from /api/v1/states.json.
  perState: [
    { title: "The first hour after water damage", urlTemplate: `${origin}/{state}/guides/water-damage-first-hour/` },
    { title: "Filing a water damage insurance claim in {State}", urlTemplate: `${origin}/{state}/guides/{state}-water-damage-insurance-claim/` },
    { title: "Preventing and thawing frozen pipes in {State}", urlTemplate: `${origin}/{state}/guides/frozen-pipes-{state}/` },
    { title: "Sewer backup in {State}", urlTemplate: `${origin}/{state}/guides/sewer-backup-{state}/` },
    { title: "Basement flooding and sump pumps", urlTemplate: `${origin}/{state}/guides/basement-flooding-sump-pump/` },
    { title: "Mold after water damage", urlTemplate: `${origin}/{state}/guides/mold-after-water-damage/` },
    { title: "Ice dams", urlTemplate: `${origin}/{state}/guides/ice-dams/` },
    { title: "Choosing a restoration company", urlTemplate: `${origin}/{state}/guides/choosing-restoration-company/` },
    { title: "Water damage cost estimator", urlTemplate: `${origin}/{state}/tools/cost-estimator/` },
    { title: "Printable emergency checklist", urlTemplate: `${origin}/{state}/tools/emergency-checklist/` },
  ],
});

export const sourceNote = {
  publisher: SITE.brand,
  license: "May be used with attribution to Local Water & Mold and a link to the page you cite.",
  sources: `U.S. Census Bureau ${DATA_META.acsRelease} (${DATA_META.acsYears}); ${DATA_META.weatherSource}, ${DATA_META.weatherPeriod}`,
  generated: DATA_META.generated,
};

export const json = (body: unknown) =>
  new Response(JSON.stringify(body, null, 2), { headers: { "Content-Type": "application/json; charset=utf-8" } });
