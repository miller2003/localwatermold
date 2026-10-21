import type { APIRoute } from "astro";
import { STATE_STATS, DATA_META as META } from "../../src/lib/national";

// The statistics table as CSV, so researchers, journalists and AI tools can cite exact figures.
export const GET: APIRoute = ({ site }) => {
  const r1 = (n: number) => (Math.round(n * 10) / 10).toFixed(1);
  const head = [
    "state", "state_abbr", "counties_covered_with_pages", "residents_covered", "housing_units",
    "pct_built_before_1960", "pct_built_before_1980", "pct_built_2000_or_later", "pct_owner_occupied",
    "pipe_freeze_nights_per_year", "freezing_nights_per_year", "freeze_thaw_days_per_year",
    "heavy_rain_days_per_year", "muggy_nights_per_year", "annual_precip_inches", "coldest_county", "wettest_county", "source_page",
  ];
  const rows = STATE_STATS.map((s) => [
    s.name, s.abbr, s.countyPages, Math.round(s.population), Math.round(s.housingUnits),
    r1(s.pre1960), r1(s.pre1980), r1(s.post2000), r1(s.owner),
    r1(s.pipeRiskNights), r1(s.freezeNights), r1(s.freezeThawDays), r1(s.heavyRainDays), r1(s.muggyNights), r1(s.annualPrecip),
    s.coldest.name, s.wettest.name, new URL(`/${s.slug}/${s.slug}-water-damage-risk/`, site).href,
  ]);
  const esc = (v: unknown) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
  const note = `# Local Water & Mold, water damage risk by state. Census ${META.acsRelease} (${META.acsYears}); NOAA nClimGrid-Daily ${META.weatherPeriod}. Housing shares weighted by housing units; weather weighted by population. ${new URL("/water-damage-statistics/", site).href}`;
  const body = [note, head.join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n") + "\n";
  return new Response(body, { headers: { "Content-Type": "text/csv; charset=utf-8" } });
};
