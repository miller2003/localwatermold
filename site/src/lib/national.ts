// Site-wide summaries for the root pages (national build). Reads every state's built data.
import { ALL_STATES, type StateConfig } from "./state";

interface Row { pilot: boolean; population: number }
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
