import { S } from "./state";
// Water Damage Risk Index: a transparent composite of four county factors, each converted to a
// percentile rank among the state's counties with data, then weighted. 100 = highest relative risk.
import { type County, allCounties } from "./data";

export const FACTORS = [
  { key: "freeze", label: "Pipe-freeze nights", weight: 0.3, get: (c: County) => c.weather?.pipeRiskNights, unit: "nights ≤ 20°F / yr" },
  { key: "age", label: "Homes built before 1960", weight: 0.3, get: (c: County) => c.builtPre1960Pct, unit: "% of homes" },
  { key: "rain", label: "Heavy-rain days", weight: 0.25, get: (c: County) => c.weather?.heavyRainDays, unit: "days ≥ 1 in / yr" },
  { key: "humid", label: "Muggy nights", weight: 0.15, get: (c: County) => c.weather?.muggyNights, unit: "nights ≥ 65°F / yr" },
] as const;

function percentile(value: number, sorted: number[]) {
  if (sorted.length < 2) return 0.5;
  let below = 0, equal = 0;
  for (const v of sorted) { if (v < value) below++; else if (v === value) equal++; }
  return (below + (equal - 1) / 2) / (sorted.length - 1);
}

let cache: Map<string, { score: number; rank: number; of: number; parts: Record<string, number> }> | null = null;

export function riskIndex() {
  if (cache) return cache;
  const pool = allCounties().filter((c) => c.weather);
  const sorted = Object.fromEntries(FACTORS.map((f) => [f.key, pool.map((c) => f.get(c)!).sort((a, b) => a - b)]));
  const scored = pool.map((c) => {
    const parts: Record<string, number> = {};
    let s = 0;
    for (const f of FACTORS) {
      const p = percentile(f.get(c)!, sorted[f.key]);
      parts[f.key] = Math.round(p * 100);
      s += p * f.weight;
    }
    return { slug: c.slug, score: Math.round(s * 100), parts };
  });
  scored.sort((a, b) => b.score - a.score);
  cache = new Map(scored.map((x, i) => [x.slug, { score: x.score, rank: i + 1, of: scored.length, parts: x.parts }]));
  return cache;
}

export const riskFor = (slug: string) => riskIndex().get(slug);

export function riskLabel(score: number) {
  return score >= 70 ? "High" : score >= 45 ? "Elevated" : score >= 25 ? "Moderate" : "Lower";
}
