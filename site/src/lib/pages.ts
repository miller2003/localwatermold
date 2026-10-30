// Which counties get a page. The pipeline marks every county with weather data as `pilot`; this trims
// the small ones (src/data/county-pages.json) so similar rural pages don't crowd the similarity limit.
import RULE from "../data/county-pages.json";

const KEEP = RULE.keep as Record<string, string[]>;
const DROP = RULE.drop as Record<string, string[]>;

export function applyCountyPageRule(stateKey: string, counties: { slug: string; population: number; pilot: boolean }[]) {
  const keep = new Set(KEEP[stateKey] ?? []);
  const drop = new Set(DROP[stateKey] ?? []);
  for (const c of counties) {
    if (c.pilot && (drop.has(c.slug) || (c.population < RULE.minPopulation && !keep.has(c.slug)))) c.pilot = false;
  }
}
