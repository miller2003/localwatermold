// Site-wide summaries for the root pages (national build). Reads every state's built data.
import { ALL_STATES, type StateConfig } from "./state";

interface Row {
  pilot: boolean; population: number; housingUnits: number; name: string; slug: string;
  builtPre1960Pct: number; builtPre1980Pct: number; built2000PlusPct: number; ownerPct: number;
  weather?: Record<string, number>;
}
interface StateData { meta: Record<string, string | number>; counties: Row[] }
const DATA = import.meta.glob("../data/*/counties.json", { eager: true, import: "default" }) as Record<string, StateData>;

export interface StateSummary extends StateConfig {
  countyPages: number;
  countyCount: number;
  residents: number;
}

export const STATE_SUMMARIES: StateSummary[] = ALL_STATES.filter((s) => DATA[`../data/${s.key}/counties.json`])
  .map((s) => {
    const d = DATA[`../data/${s.key}/counties.json`];
    const pilots = d.counties.filter((c) => c.pilot);
    return { ...s, countyPages: pilots.length, countyCount: d.counties.length, residents: pilots.reduce((n, c) => n + c.population, 0) };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

export const TOTALS = {
  states: STATE_SUMMARIES.length,
  countyPages: STATE_SUMMARIES.reduce((n, s) => n + s.countyPages, 0),
  residents: STATE_SUMMARIES.reduce((n, s) => n + s.residents, 0),
};

const anyMeta = Object.values(DATA)[0]?.meta ?? {};
export const DATA_META = {
  acsRelease: String(anyMeta.acsRelease ?? ""),
  acsYears: String(anyMeta.acsYears ?? ""),
  weatherSource: String(anyMeta.weatherSource ?? ""),
  weatherPeriod: String(anyMeta.weatherPeriod ?? ""),
  boundarySource: String(anyMeta.boundarySource ?? ""),
  generated: String(anyMeta.generated ?? ""),
};

// Statewide figures for the national statistics page, built from county records. Housing shares are
// weighted by housing units, so they're statewide shares rather than county medians. Weather is
// weighted by population: what the typical resident's county sees in a year.
export interface StateStats {
  key: string; name: string; slug: string; abbr: string;
  population: number; housingUnits: number; countyPages: number;
  pre1960: number; pre1980: number; post2000: number; owner: number;
  pipeRiskNights: number; freezeNights: number; freezeThawDays: number; heavyRainDays: number; muggyNights: number; annualPrecip: number;
  coldest: { name: string; slug: string; value: number };
  wettest: { name: string; slug: string; value: number };
}
const wavg = (rows: Row[], get: (r: Row) => number, w: (r: Row) => number) => {
  const tw = rows.reduce((n, r) => n + w(r), 0);
  return tw ? rows.reduce((n, r) => n + get(r) * w(r), 0) / tw : 0;
};
const top = (rows: Row[], key: string) => {
  const r = [...rows].sort((a, b) => (b.weather![key] ?? 0) - (a.weather![key] ?? 0))[0];
  return { name: r.name, slug: r.slug, value: r.weather![key] };
};
export const STATE_STATS: StateStats[] = STATE_SUMMARIES.map((s) => {
  const rows = DATA[`../data/${s.key}/counties.json`].counties;
  const wx = rows.filter((r) => r.weather);
  const pages = wx.filter((r) => r.pilot);
  const hu = (r: Row) => r.housingUnits, pop = (r: Row) => r.population;
  const w = (k: string) => wavg(wx, (r) => r.weather![k] ?? 0, pop);
  return {
    key: s.key, name: s.name, slug: s.slug, abbr: s.abbr,
    population: rows.reduce((n, r) => n + r.population, 0),
    housingUnits: rows.reduce((n, r) => n + r.housingUnits, 0),
    countyPages: s.countyPages,
    pre1960: wavg(rows, (r) => r.builtPre1960Pct, hu),
    pre1980: wavg(rows, (r) => r.builtPre1980Pct, hu),
    post2000: wavg(rows, (r) => r.built2000PlusPct, hu),
    owner: wavg(rows, (r) => r.ownerPct, hu),
    pipeRiskNights: w("pipeRiskNights"), freezeNights: w("freezeNights"), freezeThawDays: w("freezeThawDays"),
    heavyRainDays: w("heavyRainDays"), muggyNights: w("muggyNights"), annualPrecip: w("annualPrecip"),
    coldest: top(pages.length ? pages : wx, "pipeRiskNights"),
    wettest: top(pages.length ? pages : wx, "heavyRainDays"),
  };
});
