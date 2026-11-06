// The Water Damage Risk Index model, free of any one state's data so both the state pages
// (src/lib/risk.ts) and the national methodology page (src/lib/methodology.ts) use the same
// factors, weights, percentile rule and labels. Change the model here and both follow.

export interface RiskInput {
  builtPre1960Pct: number;
  weather?: { pipeRiskNights: number; heavyRainDays: number; muggyNights: number } | Record<string, number>;
}

export const FACTOR_SPECS = [
  { key: "freeze", label: "Pipe-freeze nights", weight: 0.3, unit: "nights ≤ 20°F / yr", get: (c: RiskInput) => c.weather?.pipeRiskNights },
  { key: "age", label: "Homes built before 1960", weight: 0.3, unit: "% of homes", get: (c: RiskInput) => c.builtPre1960Pct },
  { key: "rain", label: "Heavy-rain days", weight: 0.25, unit: "days ≥ 1 in / yr", get: (c: RiskInput) => c.weather?.heavyRainDays },
  { key: "humid", label: "Muggy nights", weight: 0.15, unit: "nights ≥ 65°F / yr", get: (c: RiskInput) => c.weather?.muggyNights },
] as const;

export type FactorKey = (typeof FACTOR_SPECS)[number]["key"];

/** Mid-rank percentile in [0, 1]: the share of other counties below this value, ties split evenly. */
export function percentile(value: number, sorted: number[]) {
  if (sorted.length < 2) return 0.5;
  let below = 0, equal = 0;
  for (const v of sorted) { if (v < value) below++; else if (v === value) equal++; }
  return (below + (equal - 1) / 2) / (sorted.length - 1);
}

/** Percentile of every factor for every county in the pool (counties with weather data). */
export function factorPercentiles<T extends RiskInput>(pool: T[]): Record<FactorKey, number>[] {
  const sorted = Object.fromEntries(FACTOR_SPECS.map((f) => [f.key, pool.map((c) => f.get(c)!).sort((a, b) => a - b)]));
  return pool.map((c) => Object.fromEntries(FACTOR_SPECS.map((f) => [f.key, percentile(f.get(c)!, sorted[f.key])])) as Record<FactorKey, number>);
}

/** Score 0 to 100 from factor percentiles and a set of weights (defaults to the published ones). */
export function scoreOf(parts: Record<FactorKey, number>, weights: Partial<Record<FactorKey, number>> = DEFAULT_WEIGHTS) {
  let s = 0, w = 0;
  for (const f of FACTOR_SPECS) {
    const wk = weights[f.key] ?? 0;
    s += parts[f.key] * wk;
    w += wk;
  }
  return Math.round((s / (w || 1)) * 100);
}

export const DEFAULT_WEIGHTS = Object.fromEntries(FACTOR_SPECS.map((f) => [f.key, f.weight])) as Record<FactorKey, number>;

export const RISK_BANDS = [
  { label: "High", min: 70 },
  { label: "Elevated", min: 45 },
  { label: "Moderate", min: 25 },
  { label: "Lower", min: 0 },
] as const;

export function riskLabel(score: number) {
  return RISK_BANDS.find((b) => score >= b.min)!.label;
}
