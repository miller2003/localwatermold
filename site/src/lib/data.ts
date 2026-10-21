import { STATE_KEY } from "./state";

const DATA = import.meta.glob("../data/*/counties.json", { eager: true, import: "default" });
const MAPS = import.meta.glob("../data/*/map.json", { eager: true, import: "default" });
const raw = DATA[`../data/${STATE_KEY}/counties.json`];
if (!raw) throw new Error(`No data for state "${STATE_KEY}". Run the pipeline: python derive.py --state ${STATE_KEY}`);
export const MAP = MAPS[`../data/${STATE_KEY}/map.json`] as { viewBox: string; paths: Record<string, string>; centers: Record<string, [number, number]> };

export interface Weather {
  period: string;
  freezeNights: number;
  pipeRiskNights: number;
  belowZeroNights: number;
  iceDays: number;
  longestIceStreak: number;
  longestIceStreakEnd: string | null;
  coldestTemp: number;
  coldestDate: string;
  annualPrecip: number;
  heavyRainDays: number;
  wettestDay: number;
  wettestDate: string;
  freezeThawDays: number;
  muggyNights: number;
  max3DayRain: number;
  max3DayEnd: string;
  avgFirstFreeze: string | null;
  avgLastFreeze: string | null;
  monthlyFreeze: number[];
  monthlyHeavyRain: number[];
  monthlyRain: number[];
}

export interface County {
  geoid: string;
  fips: string;
  name: string;
  short: string;
  slug: string;
  seat: string;
  founded: number | null;
  areaSqMi: number | null;
  lat: number;
  lon: number;
  population: number;
  medianAge: number;
  housingUnits: number;
  vacancyPct: number;
  ownerPct: number;
  singleFamilyPct: number;
  mobileHomePct: number;
  medianYearBuilt: number;
  builtPre1960Pct: number;
  builtPre1980Pct: number;
  built2000PlusPct: number;
  builtBuckets: { label: string; pct: number }[];
  heatGasPct: number;
  heatElectricPct: number;
  heatPropanePct: number;
  heatWoodPct: number;
  medianHomeValue: number;
  medianIncome: number;
  adjacent: string[];
  places: { name: string; population: number }[];
  pilot: boolean;
  weather?: Weather;
}

type StateStats = Record<string, number> & { weather: Record<string, number> };

const data = raw as unknown as {
  meta: Record<string, string | number>;
  state: StateStats;
  pilot: string[];
  counties: County[];
};

export const META = data.meta;
export const STATE = data.state;

export const allCounties = () => data.counties;
export const pilotCounties = () => data.counties.filter((c) => c.pilot);
export const countyBySlug = (slug: string) => data.counties.find((c) => c.slug === slug);

export const int = (n: number) => Math.round(n).toLocaleString("en-US");
export const money = (n: number) => "$" + Math.round(n).toLocaleString("en-US");
export const pct = (n: number) => `${Math.round(n)}%`;

export function longDate(iso: string) {
  return new Date(iso + "T12:00:00Z").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}
export function monthYear(iso: string) {
  return new Date(iso + "T12:00:00Z").toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

/** Rank of a county among pilot or all counties for a numeric key (1 = highest). */
export function rank(c: County, get: (x: County) => number | undefined, pool = allCounties()) {
  const vals = pool.map(get).filter((v): v is number => v !== undefined).sort((a, b) => b - a);
  const v = get(c);
  return { rank: v === undefined ? 0 : vals.indexOf(v) + 1, of: vals.length };
}

export function placeList(c: County, n = 4) {
  const names = c.places.slice(0, n).map((p) => p.name);
  if (names.length <= 1) return names.join("");
  return names.slice(0, -1).join(", ") + " and " + names[names.length - 1];
}
