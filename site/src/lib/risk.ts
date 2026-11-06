// Water Damage Risk Index: a transparent composite of four county factors, each converted to a
// percentile rank among the state's counties with data, then weighted. 100 = highest relative risk.
// The model itself (factors, weights, percentile rule, labels) lives in risk-model.ts and is
// documented on /methodology/.
import { type County, allCounties } from "./data";
import { FACTOR_SPECS, factorPercentiles, scoreOf } from "./risk-model";

export { riskLabel } from "./risk-model";
export const FACTORS = FACTOR_SPECS;

let cache: Map<string, { score: number; rank: number; of: number; parts: Record<string, number> }> | null = null;

export function riskIndex() {
  if (cache) return cache;
  const pool: County[] = allCounties().filter((c) => c.weather);
  const pcts = factorPercentiles(pool);
  const scored = pool.map((c, i) => ({
    slug: c.slug,
    score: scoreOf(pcts[i]),
    parts: Object.fromEntries(FACTOR_SPECS.map((f) => [f.key, Math.round(pcts[i][f.key] * 100)])),
  }));
  scored.sort((a, b) => b.score - a.score);
  cache = new Map(scored.map((x, i) => [x.slug, { score: x.score, rank: i + 1, of: scored.length, parts: x.parts }]));
  return cache;
}

export const riskFor = (slug: string) => riskIndex().get(slug);
