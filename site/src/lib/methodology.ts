// Figures for /methodology/, computed at build time from every state's county data so the page can
// never drift from the model it describes: coverage counts, how the four risk factors relate to each
// other, and how much the county ranking moves when the weights change (a one-at-a-time sensitivity
// analysis in the sense of the OECD/JRC composite indicator handbook).
import { STATE_SUMMARIES, countiesOf } from "./national";
import { FACTOR_SPECS, DEFAULT_WEIGHTS, RISK_BANDS, factorPercentiles, riskLabel, scoreOf, type FactorKey, type RiskInput } from "./risk-model";

type Row = RiskInput & { slug: string; population: number; pilot: boolean; weather?: Record<string, number> };

/** Average ranks (1-based), ties share the mean of the ranks they span. */
function ranks(xs: number[]) {
  const idx = xs.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]);
  const r = new Array<number>(xs.length);
  for (let i = 0; i < idx.length; ) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
    for (let k = i; k <= j; k++) r[idx[k][1]] = (i + j) / 2 + 1;
    i = j + 1;
  }
  return r;
}
function pearson(a: number[], b: number[]) {
  const n = a.length, ma = a.reduce((s, x) => s + x, 0) / n, mb = b.reduce((s, x) => s + x, 0) / n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) { num += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2; }
  return da && db ? num / Math.sqrt(da * db) : 1;
}
/** Spearman's rank correlation with tie correction (Pearson on average ranks). */
export const spearman = (a: number[], b: number[]) => pearson(ranks(a), ranks(b));
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b), m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const topSet = (slugs: string[], scores: number[], k: number) =>
  new Set(slugs.map((s, i) => [s, scores[i]] as const).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, k).map((x) => x[0]));

const STATES = STATE_SUMMARIES.map((s) => ({ key: s.key, name: s.name, rows: countiesOf(s.key) as unknown as Row[] }));
const POOLS = STATES.map((s) => {
  const pool = s.rows.filter((c) => c.weather);
  return { ...s, pool, pcts: factorPercentiles(pool) };
});

export const COVERAGE = {
  states: STATES.length,
  counties: STATES.reduce((n, s) => n + s.rows.length, 0),
  withWeather: POOLS.reduce((n, s) => n + s.pool.length, 0),
  pages: STATES.reduce((n, s) => n + s.rows.filter((c) => c.pilot).length, 0),
  population: STATES.reduce((n, s) => n + s.rows.reduce((m, c) => m + c.population, 0), 0),
  pagePopulation: STATES.reduce((n, s) => n + s.rows.filter((c) => c.pilot).reduce((m, c) => m + c.population, 0), 0),
  smallestPool: Math.min(...POOLS.map((s) => s.pool.length)),
  largestPool: Math.max(...POOLS.map((s) => s.pool.length)),
};

// Share of scored counties in each band, across all states.
const ALL_SCORES = POOLS.flatMap((s) => s.pcts.map((p) => scoreOf(p)));
export const BAND_SHARES = RISK_BANDS.map((b) => ({
  label: b.label,
  min: b.min,
  share: ALL_SCORES.filter((x) => riskLabel(x) === b.label).length / ALL_SCORES.length,
}));

// Median (across states) Spearman correlation between each pair of raw factor values.
const F = FACTOR_SPECS;
export const FACTOR_CORRELATIONS = F.flatMap((a, i) => F.slice(i + 1).map((b) => ({
  a: a.label, b: b.label,
  rho: median(POOLS.map((s) => spearman(s.pool.map((c) => a.get(c)!), s.pool.map((c) => b.get(c)!)))),
})));
export const MAX_ABS_CORRELATION = Math.max(...FACTOR_CORRELATIONS.map((c) => Math.abs(c.rho)));

// Alternative weightings compared with the published one, state by state.
const SCENARIOS: { name: string; weights: Partial<Record<FactorKey, number>> }[] = [
  { name: "Equal weights (25% each)", weights: { freeze: 1, age: 1, rain: 1, humid: 1 } },
  ...F.map((f) => ({ name: `Without ${f.label.toLowerCase()}`, weights: { ...DEFAULT_WEIGHTS, [f.key]: 0 } })),
];
export const SENSITIVITY = SCENARIOS.map((sc) => {
  const perState = POOLS.map((s) => {
    const slugs = s.pool.map((c) => c.slug);
    const base = s.pcts.map((p) => scoreOf(p));
    const alt = s.pcts.map((p) => scoreOf(p, sc.weights));
    const k = Math.max(1, Math.ceil(s.pool.length / 10));
    const a = topSet(slugs, base, k), b = topSet(slugs, alt, k);
    return { rho: spearman(base, alt), overlap: [...a].filter((x) => b.has(x)).length / k, state: s.name };
  });
  const worst = perState.reduce((m, x) => (x.rho < m.rho ? x : m));
  return {
    name: sc.name,
    medianRho: median(perState.map((x) => x.rho)),
    minRho: worst.rho,
    minState: worst.state,
    medianOverlap: median(perState.map((x) => x.overlap)),
  };
});
