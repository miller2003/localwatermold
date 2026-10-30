import { S } from "./state";
// County copy built only from that county's data. Every claim is tied to a value in the
// county record. Phrasing rotates by county (stable hash) and by where the county ranks,
// so neighbors with similar numbers still read differently.
import { type County, STATE, allCounties, rank, int, pct, longDate, monthYear, placeList } from "./data";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const ORD = (n: number) => {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};
const W = STATE.weather;

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
/** Deterministic choice of phrasing for this county and this slot. */
function pick<T>(c: County, slot: string, options: T[]): T {
  return options[hash(c.slug + ":" + slot) % options.length];
}
/** "1 night", "30 nights" */
const pl = (n: number, word: string) => `${n} ${n === 1 ? word : word + "s"}`;
const list = (xs: string[]) => (xs.length <= 1 ? xs.join("") : xs.slice(0, -1).join(", ") + " and " + xs.at(-1));

type Tier = "high" | "mid" | "low";
function tier(c: County, get: (x: County) => number | undefined, pool: County[]): { tier: Tier; rank: number; of: number } {
  const r = rank(c, get, pool);
  const t = r.rank <= Math.ceil(r.of / 3) ? "high" : r.rank > Math.floor((2 * r.of) / 3) ? "low" : "mid";
  return { tier: t, ...r };
}
const weatherPool = () => allCounties().filter((c) => c.weather);

// Michigan's Upper Peninsula counties (FIPS), named as their own region.
const MI_UP = new Set(["26003", "26013", "26033", "26041", "26043", "26053", "26061", "26071", "26083", "26095", "26097", "26103", "26109", "26131", "26153"]);

/** Region name relative to the state's own extent (thirds of latitude and longitude). */
export function region(c: County) {
  if (S.key === "mi") {
    if (MI_UP.has(c.fips)) return "Michigan's Upper Peninsula";
    return c.lat > 44.3 ? "northern Lower Michigan" : c.lon > -84 ? "southeast Michigan" : c.lat > 43.2 ? "central Lower Michigan" : "southwest Michigan";
  }
  const all = allCounties();
  const lats = all.map((x) => x.lat), lons = all.map((x) => x.lon);
  const [la0, la1] = [Math.min(...lats), Math.max(...lats)];
  const [lo0, lo1] = [Math.min(...lons), Math.max(...lons)];
  const ns = c.lat > la0 + ((la1 - la0) * 2) / 3 ? "north" : c.lat < la0 + (la1 - la0) / 3 ? "south" : "";
  const ew = c.lon > lo0 + ((lo1 - lo0) * 2) / 3 ? "east" : c.lon < lo0 + (lo1 - lo0) / 3 ? "west" : "";
  if (ns && ew) return `${ns}${ew} ${S.name}`;
  if (ns) return `${ns}ern ${S.name}`;
  if (ew) return `${ew}ern ${S.name}`;
  return `central ${S.name}`;
}

function compare(value: number, median: number, unit = "", tight = 0.08) {
  const diff = (value - median) / (median || 1);
  if (Math.abs(diff) <= tight) return `close to the ${S.name} county median of ${median}${unit}`;
  return `${diff > 0 ? "above" : "below"} the ${S.name} county median of ${median}${unit}`;
}

export function seasonCalendar(c: County) {
  const w = c.weather!;
  // Walk the cold season from July to June so winter reads "December to March".
  const order = [6, 7, 8, 9, 10, 11, 0, 1, 2, 3, 4, 5];
  const cold = order.filter((m) => w.monthlyFreeze[m] >= 12);
  const rainTop = w.monthlyHeavyRain.map((v, i) => [v, i] as const).sort((a, b) => b[0] - a[0]).slice(0, 3).map(([, i]) => i).sort((a, b) => a - b);
  const peakFreeze = order.reduce((best, m) => (w.monthlyFreeze[m] > w.monthlyFreeze[best] ? m : best), 0);
  return {
    freeze: cold.length ? (cold.length === 1 ? MONTHS[cold[0]] : `${MONTHS[cold[0]]} to ${MONTHS[cold.at(-1)!]}`) : "midwinter",
    peakFreeze: MONTHS[peakFreeze],
    rain: list(rainTop.map((i) => MONTHS[i])),
    rainPeak: MONTHS[w.monthlyHeavyRain.indexOf(Math.max(...w.monthlyHeavyRain))],
    wettestMonth: MONTHS[w.monthlyRain.indexOf(Math.max(...w.monthlyRain))],
  };
}

export function intro(c: County) {
  const others = c.places.filter((p) => p.name !== c.seat).slice(0, 3).map((p) => p.name);
  const size = c.areaSqMi ? `${int(c.areaSqMi)} square miles` : "";
  const first = pick(c, "intro1", [
    `${c.short} County covers ${size ? size + " of " : ""}${region(c)}, with about ${int(c.population)} residents and ${int(c.housingUnits)} homes.`,
    `About ${int(c.population)} people live in ${c.short} County${size ? `, ${size} in ${region(c)}` : ""}, in roughly ${int(c.housingUnits)} homes.`,
    `With ${int(c.housingUnits)} homes and around ${int(c.population)} residents, ${c.short} County is ${size ? `${size} of ` : "part of "}${region(c)}.`,
  ]);
  const second = c.seat
    ? pick(c, "intro2", [
        `${c.seat} is the county seat${others.length ? `; ${list(others)} ${others.length === 1 ? "is the next largest community" : "are the next largest communities"}` : ""}.`,
        `The county seat is ${c.seat}${others.length ? `, and ${list(others)} ${others.length === 1 ? "is the other large town" : "round out the largest towns"}` : ""}.`,
        `${others.length ? `Besides ${c.seat}, the county seat, the other main ${others.length === 1 ? "community is" : "communities are"} ${list(others)}.` : `${c.seat} is the county seat.`}`,
      ])
    : "";
  const era = c.medianYearBuilt < 1960 ? "old" : c.medianYearBuilt < 1985 ? "mid" : "new";
  const third = {
    old: `It has some of the oldest housing in the state: the median home went up in ${c.medianYearBuilt}.`,
    mid: pick(c, "era", [
      `The county's median home was built in ${c.medianYearBuilt}.`,
      `Half the homes here were built before ${c.medianYearBuilt}, half after.`,
    ]),
    new: `Much of its housing is recent, with a median build year of ${c.medianYearBuilt}.`,
  }[era];
  return [first, second, third].filter(Boolean).join(" ");
}

export function housing(c: County) {
  const out: string[] = [];
  const t = tier(c, (x) => x.builtPre1980Pct, allCounties());
  out.push(
    pick(c, "h1", [
      `${pct(c.builtPre1980Pct)} of homes in ${c.short} County predate 1980, ${compare(c.builtPre1980Pct, STATE.builtPre1980Pct, "%")}, which ranks ${ORD(t.rank)} of ${S.name}'s ${t.of} counties.`,
      `${S.name}'s ${t.of} counties range widely in housing age; ${c.short} ranks ${ORD(t.rank)}, with ${pct(c.builtPre1980Pct)} of its homes built before 1980.`,
      `Roughly ${pct(c.builtPre1980Pct)} of the county's housing was built before 1980. That puts ${c.short} ${t.tier === "high" ? "among the oldest housing stocks" : t.tier === "low" ? "among the newer housing stocks" : "near the middle"} of ${S.name}'s ${t.of} counties.`,
    ]),
  );
  if (c.builtPre1960Pct >= STATE.builtPre1960Pct + 4) {
    out.push(
      pick(c, "h2old", [
        `${pct(c.builtPre1960Pct)} were built before 1960. Homes from that era often still have galvanized steel supply pipe, which rusts from the inside until it pinholes, and cast iron drains that crack with age. Slow leaks behind walls are a common start to water damage in these houses.`,
        `Before 1960 is when ${pct(c.builtPre1960Pct)} of these homes went up. Galvanized supply lines and cast iron drains were standard then, and after 60-plus years both corrode and crack, often out of sight inside a wall or under a slab.`,
        `In ${c.short} County ${pct(c.builtPre1960Pct)} of homes are older than 1960. If yours is one of them and the plumbing has never been replaced, expect galvanized steel supply pipe and cast iron drain lines, the two materials most likely to fail quietly.`,
      ]),
    );
  } else if (c.built2000PlusPct >= STATE.built2000PlusPct + 4) {
    out.push(
      pick(c, "h2new", [
        `${pct(c.built2000PlusPct)} of homes were built in 2000 or later, more than in most of ${S.name}. Newer plumbing rarely corrodes, so damage here tends to come from appliance supply lines, water heaters, sump pumps and storms.`,
        `Growth since 2000 added ${pct(c.built2000PlusPct)} of today's homes. In houses that new, the weak points are washing machine hoses, ice maker lines, water heaters and sump pumps rather than the pipes in the walls.`,
        `Since 2000 the county has added enough housing that ${pct(c.built2000PlusPct)} of homes are that new. Modern PEX and copper rarely fail on their own; the leaks come from connections, appliances and storms.`,
      ]),
    );
  } else {
    out.push(
      pick(c, "h2mix", [
        `The mix runs from ${pct(c.builtPre1960Pct)} built before 1960 to ${pct(c.built2000PlusPct)} built since 2000, so older neighborhoods bring aging pipe while newer subdivisions bring failed appliance lines and water heaters.`,
        `Older and newer homes sit side by side here: ${pct(c.builtPre1960Pct)} predate 1960 and ${pct(c.built2000PlusPct)} are from 2000 or later. Corroded pipe is the typical failure in the first group, burst supply hoses in the second.`,
        `Housing age is mixed: ${pct(c.builtPre1960Pct)} of homes are pre-1960 and ${pct(c.built2000PlusPct)} are 2000 or newer. Ask any plumber which era your house is from and you'll know which failures to watch for.`,
      ]),
    );
  }
  const b8090 = c.builtBuckets.find((b) => b.label === "1980–1999")?.pct ?? 0;
  if (b8090 >= 22) {
    out.push(
      pick(c, "h3", [
        `About ${pct(b8090)} of homes went up between 1980 and 1999. Some houses from the late 1970s to the mid-1990s were plumbed with polybutylene, a gray plastic pipe known for failing at fittings. A plumber can tell you in a few minutes whether you have it.`,
        `${pct(b8090)} date from 1980 to 1999, the window when polybutylene, a gray flexible plastic supply pipe, was used in some homes. It's prone to leaks at the fittings, so it's worth checking for in a house from those years.`,
        `The 1980s and 1990s account for ${pct(b8090)} of the county's homes. If yours is from those decades, look under the sinks and at the water heater for gray plastic pipe stamped PB, which is polybutylene and leak-prone.`,
      ]),
    );
  }
  if (c.mobileHomePct >= 7) {
    out.push(
      pick(c, "h4", [
        `${pct(c.mobileHomePct)} of homes are manufactured or mobile homes, ${compare(c.mobileHomePct, STATE.mobileHomePct, "%", 0.15)}. Their water lines run under the floor behind the skirting, so a torn skirt or failed heat tape freezes them faster than lines in a site-built house.`,
        `Manufactured and mobile homes make up ${pct(c.mobileHomePct)} of the housing here. Water lines in the underbelly depend on intact skirting and working heat tape, and they're usually the first to freeze in a cold snap.`,
        `Here ${pct(c.mobileHomePct)} of housing is manufactured homes. Check the skirting and the heat tape on the main water line every fall, because that one exposed line is what freezes.`,
      ]),
    );
  }
  if (c.vacancyPct >= STATE.vacancyPct + 2) {
    out.push(
      pick(c, "h5", [
        `${pct(c.vacancyPct)} of homes were vacant at survey time. A leak in an empty rental or seasonal house can run for days before anyone notices, which is why those losses tend to be larger.`,
        `The Census counted ${pct(c.vacancyPct)} of homes as vacant, ${compare(c.vacancyPct, STATE.vacancyPct, "%")}. Empty houses are where a small leak turns into a large claim, because nobody is there to hear it.`,
        `With ${pct(c.vacancyPct)} of homes empty at survey time, landlords and seasonal owners should shut off the main or schedule checks in winter. An unheated vacant house is also where many policies limit freeze coverage.`,
      ]),
    );
  }
  if (c.ownerPct <= STATE.ownerPct - 6) {
    out.push(`Renters occupy ${pct(100 - c.ownerPct)} of homes. If you rent, the building is usually the landlord's to repair, but your belongings are only covered by renters insurance.`);
  }
  return out;
}

export function climate(c: County) {
  const w = c.weather!;
  const pool = weatherPool();
  const out: string[] = [];
  const fz = tier(c, (x) => x.weather?.pipeRiskNights, pool);
  const rn = tier(c, (x) => x.weather?.heavyRainDays, pool);
  const cal = seasonCalendar(c);

  const freezeLead = {
    high: pick(c, "fzH", [
      `${c.short} is on the colder side of ${S.name} for pipes.`,
      `${c.short} County gets more hard-freeze nights than most of ${S.name}.`,
    ]),
    mid: pick(c, "fzM", [
      `Pipe-freeze risk in ${c.short} County sits near the middle of the state.`,
      `For frozen pipes, ${c.short} County is a typical ${S.name} county, which is still plenty.`,
    ]),
    low: pick(c, "fzL", [
      `${c.short} County is milder than most of ${S.name}, but not mild enough to skip winterizing.`,
      `Winters here are on the gentler end for ${S.name}, and pipes still freeze.`,
    ]),
  }[fz.tier];
  out.push(
    freezeLead + " " +
      pick(c, "fz2", [
        `From ${w.period} it averaged ${pl(w.pipeRiskNights, "night")} a year at 20°F or colder, the range where pipes in exterior walls, crawl spaces and unheated garages freeze, and ${pl(w.freezeNights, "night")} at or below 32°F. That ranks ${ORD(fz.rank)} of ${fz.of} counties.`,
        `In the ${w.period} record the county logged about ${pl(w.pipeRiskNights, "night")} a year at or below 20°F (${ORD(fz.rank)} of ${fz.of}) and ${w.freezeNights} below freezing. Twenty degrees is roughly where uninsulated pipes start to freeze.`,
        `It averaged ${w.freezeNights} freezing ${w.freezeNights === 1 ? "night" : "nights"} a year over ${w.period}, ${w.pipeRiskNights} of them at 20°F or colder, cold enough for pipes in outside walls and crawl spaces to freeze. Among ${fz.of} ${S.name} counties that's ${ORD(fz.rank)}.`,
      ]),
  );
  if (w.longestIceStreak >= 3 && w.longestIceStreakEnd) {
    out.push(
      pick(c, "streak", [
        `The longest cold spell was straight ${pl(w.longestIceStreak, "day")} without the temperature rising above freezing, ending in ${monthYear(w.longestIceStreakEnd)}. The coldest night reached about ${w.coldestTemp}°F on ${longDate(w.coldestDate)}. Burst pipes usually show up when a spell like that breaks and the ice thaws.`,
        `On ${longDate(w.coldestDate)} the low fell to about ${w.coldestTemp}°F, and in the stretch ending ${monthYear(w.longestIceStreakEnd)} the county went ${pl(w.longestIceStreak, "day")} in a row below freezing. Leaks from split pipes typically appear the day the thaw arrives.`,
        `Cold snaps are the real risk. The worst in the record lasted ${pl(w.longestIceStreak, "day")} below freezing (ending ${monthYear(w.longestIceStreakEnd)}), and the low bottomed out near ${w.coldestTemp}°F on ${longDate(w.coldestDate)}.`,
      ]),
    );
  }
  if (w.freezeNights >= 25) {
    out.push(
      pick(c, "season", [
        `Most freezing nights fall from ${cal.freeze}, peaking in ${cal.peakFreeze}. Disconnect garden hoses and shut off outdoor spigots before the first hard frost, and keep the heat at 55°F or higher if you'll be away.`,
        `The freeze season here runs ${cal.freeze}, with ${cal.peakFreeze} the coldest. If you travel then, leave the thermostat at 55°F or above and open sink cabinets on outside walls.`,
        `Expect the hardest freezes in ${cal.peakFreeze}, inside a season that runs ${cal.freeze}. That's when an outdoor spigot left connected to a hose, or a pipe in a crawl space, is most likely to split.`,
      ]),
    );
    if (w.avgFirstFreeze && w.avgLastFreeze) {
      out.push(
        pick(c, "frost", [
          `On average the first fall freeze arrives around ${w.avgFirstFreeze} and the last spring freeze around ${w.avgLastFreeze}.`,
          `Freezing nights typically start around ${w.avgFirstFreeze} and end around ${w.avgLastFreeze}.`,
        ]),
      );
    }
  } else {
    out.push(
      pick(c, "rarefreeze", [
        `Hard freezes are uncommon here, about ${pl(w.freezeNights, "night")} a year at or below 32°F, and that's exactly why they do damage: pipes in attics, exterior walls and slab-edge plumbing are rarely insulated. The coldest night in the record was about ${w.coldestTemp}°F on ${longDate(w.coldestDate)}.`,
        `With only about ${w.freezeNights} freezing ${w.freezeNights === 1 ? "night" : "nights"} a year, many homes here aren't built for cold, so a single arctic outbreak can burst pipes across the county. The record low in this data was about ${w.coldestTemp}°F, on ${longDate(w.coldestDate)}.`,
      ]),
    );
  }
  const rainLead = {
    high: `Heavy rain is a bigger factor here than in most of ${S.name}.`,
    mid: `Rainfall is about average for ${S.name}.`,
    low: `${c.short} gets fewer downpours than most ${S.name} counties, but they still fill basements.`,
  }[rn.tier];
  out.push(
    rainLead + " " +
      pick(c, "rain", [
        `The county gets about ${w.annualPrecip} inches of rain and melted snow a year, with ${w.heavyRainDays} days of an inch or more (${ORD(rn.rank)} of ${rn.of}). Those downpours cluster in ${cal.rain}, when sump pumps and gutters are tested hardest. The wettest day on record brought ${w.wettestDay} inches on ${longDate(w.wettestDate)}.`,
        `About ${w.heavyRainDays} days a year bring an inch or more (${ORD(rn.rank)} of ${rn.of}), most often in ${cal.rainPeak}, out of ${w.annualPrecip} inches of total precipitation. On ${longDate(w.wettestDate)}, ${w.wettestDay} inches fell in a single day.`,
        `Of roughly ${w.annualPrecip} inches of yearly precipitation, the damage comes from the ${w.heavyRainDays} days a year with an inch or more, ranked ${ORD(rn.rank)} of ${rn.of}. ${cal.rain} see the most. The single wettest day in the record: ${w.wettestDay} inches, ${longDate(w.wettestDate)}.`,
      ]) + " " +
      pick(c, "rain3", [
        `The worst three-day stretch dropped ${w.max3DayRain} inches, ending ${longDate(w.max3DayEnd)}, the kind of soaking that overwhelms sump pumps and storm sewers.`,
        `Multi-day storms matter most for basements; the wettest three days on record here totaled ${w.max3DayRain} inches (through ${longDate(w.max3DayEnd)}).`,
      ]),
  );
  if (w.freezeThawDays >= 20) {
    out.push(
      pick(c, "thaw", [
        `About ${pl(w.freezeThawDays, "day")} a year swing from below freezing at night to above freezing by day. Those freeze-thaw cycles feed ice dams on roofs, open cracks in foundations and driveways, and stress pipes that are already marginal.`,
        `The temperature crosses 32°F in both directions on roughly ${pl(w.freezeThawDays, "day")} a year. Each cycle melts and refreezes water at roof edges and in foundation cracks, which is how ice dams and basement seepage get started.`,
        `Freeze-thaw days, below freezing overnight and above it by afternoon, come about ${w.freezeThawDays === 1 ? "once" : `${w.freezeThawDays} times`} a year here. They're the main driver of ice dams and of water working its way through foundation cracks in late winter.`,
      ]),
    );
  }
  return out;
}

export function mold(c: County) {
  const w = c.weather!;
  const t = tier(c, (x) => x.weather?.muggyNights, weatherPool());
  const cal = seasonCalendar(c);
  const lead = pick(c, "mold1", [
    `About ${pl(w.muggyNights, "night")} a year in ${c.short} County stay at 65°F or warmer, a sign of muggy summer air (${ORD(t.rank)} of ${t.of} counties). ${cal.wettestMonth} is the wettest month.`,
    `Summer nights that don't drop below 65°F, a good marker of humid air, come about ${w.muggyNights === 1 ? "once" : `${w.muggyNights} times`} a year here, ${compare(w.muggyNights, W.muggyNights, "", 0.1)}.`,
    `${c.short} County averages ${w.muggyNights} warm, muggy ${w.muggyNights === 1 ? "night" : "nights"} a year (lows of 65°F or more) and gets the most rain in ${cal.wettestMonth}.`,
  ]);
  const tail = pick(c, "mold2", [
    `The EPA recommends keeping indoor humidity below 60%, ideally 30 to 50%. Basements can pass 60% on their own in summer, so a dehumidifier matters even without a leak, and anything wet should be dried within 24 to 48 hours.`,
    `Mold grows when indoor humidity stays above about 60%, the EPA's ceiling. A basement dehumidifier set to 50% and drying anything wet within 24 to 48 hours prevents most problems.`,
    `Keep indoor humidity under 60%, as the EPA advises, and dry any leak within 24 to 48 hours; in a humid month a wet basement left alone won't dry by itself.`,
  ]);
  return `${lead} ${tail}`;
}

export function fire(c: County) {
  const wood = c.heatWoodPct, lp = c.heatPropanePct;
  const mix = `${pct(c.heatGasPct)} utility gas, ${pct(c.heatElectricPct)} electric, ${lp >= 1 ? pct(lp) : "under 1%"} propane and ${wood >= 1 ? pct(wood) : "under 1%"} wood`;
  const first = pick(c, "fire1", [
    `Main heating fuel in ${c.short} County's occupied homes: ${mix}.`,
    `By main heating fuel, ${c.short} County homes break down as ${mix}.`,
    `Heating fuel matters for fire risk. In ${c.short} County it's ${mix}.`,
  ]);
  const woodHigh = wood >= STATE.heatWoodPct + 1;
  const lpHigh = lp >= STATE.heatPropanePct + 3;
  const fuel = woodHigh && lpHigh ? "Wood and propane heat are" : woodHigh ? "Wood heat is" : "Propane heat is";
  const second = woodHigh || lpHigh
    ? pick(c, "fire2r", [
        `${fuel} more common here than in most ${S.name} counties. Heating equipment is a common cause of home fires nationally, and the NFPA recommends having chimneys and vents inspected every year.`,
        `${fuel} above the ${S.name} norm. Annual chimney and vent inspection, which the NFPA recommends, is one of the most effective fire-prevention habits for these homes.`,
        `${fuel} more common here than the state median. Have chimneys swept and fuel-burning appliances serviced each fall, and keep three feet clear around stoves and space heaters.`,
      ])
    : pick(c, "fire2u", [
        `Heating equipment, cooking and electrical failures cause most home fires nationally. Even a small kitchen fire can leave soot through the whole house, because smoke follows air currents into closets, ducts and attic space.`,
        `Most homes here heat with gas or electricity, so cooking and electrical faults are the likelier fire sources. Even a contained kitchen fire can send soot through the ductwork to every room.`,
        `Fires here are likelier to start in the kitchen or the wiring than in the furnace. After any fire, keep the HVAC off until ducts are checked, or soot will travel through the house.`,
      ]);
  return `${first} ${second}`;
}

export interface Risk { key: string; title: string; detail: string; score: number }

export function topRisks(c: County): Risk[] {
  const w = c.weather!;
  const pool = weatherPool();
  const all = allCounties();
  const score = (get: (x: County) => number | undefined, p: County[]) => {
    const r = rank(c, get, p);
    return 1 - (r.rank - 1) / Math.max(r.of - 1, 1);
  };
  const risks: Risk[] = [
    { key: "freeze", title: "Frozen pipes", detail: `${pl(w.pipeRiskNights, "night")} a year at 20°F or colder`, score: score((x) => x.weather?.pipeRiskNights, pool) },
    { key: "age", title: "Aging plumbing", detail: `${pct(c.builtPre1960Pct)} of homes built before 1960`, score: score((x) => x.builtPre1960Pct, all) },
    { key: "rain", title: "Heavy rain and basements", detail: `${w.heavyRainDays} days a year with an inch or more`, score: score((x) => x.weather?.heavyRainDays, pool) },
    { key: "humid", title: "Muggy, mold-friendly summers", detail: `${pl(w.muggyNights, "night")} a year at 65°F or warmer`, score: score((x) => x.weather?.muggyNights, pool) },
    { key: "vacant", title: "Leaks in empty homes", detail: `${pct(c.vacancyPct)} of homes vacant`, score: score((x) => x.vacancyPct, all) * 0.9 },
    { key: "heat", title: "Wood and propane heat", detail: `${pct(c.heatWoodPct + c.heatPropanePct)} of homes`, score: score((x) => x.heatWoodPct + x.heatPropanePct, all) * 0.9 },
    { key: "thaw", title: "Freeze-thaw and ice dams", detail: `${pl(w.freezeThawDays, "freeze-thaw day")} a year`, score: score((x) => x.weather?.freezeThawDays, pool) * 0.85 },
    { key: "mobile", title: "Mobile home freeze-ups", detail: `${pct(c.mobileHomePct)} manufactured homes`, score: score((x) => x.mobileHomePct, all) * 0.85 },
  ];
  return risks.sort((a, b) => b.score - a.score).slice(0, 3);
}

export function metaDescription(c: County) {
  const w = c.weather!;
  const freeze = `${w.pipeRiskNights} pipe-freeze ${w.pipeRiskNights === 1 ? "night" : "nights"} a year`;
  // Fit in about 160 characters, the length search results show, by naming fewer towns if needed.
  const make = (n: number) => pick(c, "meta", [
    `Water, mold or fire damage in ${c.short} County, ${S.abbr}? Get a restoration company serving ${placeList(c, n)}. ${pct(c.builtPre1980Pct)} of homes here predate 1980; ${freeze}.`,
    `${c.short} County, ${S.abbr} water damage help for ${placeList(c, n)}: a local restoration company, plus data on ${pct(c.builtPre1980Pct)} pre-1980 homes and ${w.heavyRainDays} heavy-rain days a year.`,
  ]);
  return [3, 2, 1].map(make).find((d) => d.length <= 160) ?? make(1);
}

export function faqs(c: County) {
  const w = c.weather!;
  const risks = topRisks(c);
  const cal = seasonCalendar(c);
  return [
    {
      q: `Which towns in ${c.short} County does this cover?`,
      a: `Calls are routed to restoration companies that serve all of ${c.short} County, including ${placeList(c, 6)}, plus the townships and rural areas around them. If the first company can't reach you quickly, ask to be connected with another.`,
    },
    {
      q: `How often do pipes freeze in ${c.short} County?`,
      a: pick(c, "fq2", [
        `From ${w.period} the county averaged ${pl(w.pipeRiskNights, "night")} a year at 20°F or colder, mostly ${cal.freeze}. Pipes in exterior walls, crawl spaces, garages and mobile home underbellies freeze first.`,
        `About ${pl(w.pipeRiskNights, "night")} a year get to 20°F or below, concentrated in ${cal.peakFreeze}. The longest cold spell in the ${w.period} record was ${pl(w.longestIceStreak, "day")} below freezing.`,
        `Pipe-freeze weather, 20°F or colder, comes about ${pl(w.pipeRiskNights, "night")} a year in ${c.short} County, from ${cal.freeze}. Pipes along outside walls and in crawl spaces go first.`,
      ]),
    },
    {
      q: `What causes the most water damage in ${c.short} County?`,
      a: `Based on the county's housing and weather data, the main local factors are ${list(risks.map((r) => r.title.toLowerCase()))}. Appliance supply lines and water heaters cause leaks everywhere.`,
    },
    {
      q: `Will my insurance cover water damage in ${c.short} County?`,
      a: pick(c, "fq4", [
        `Sudden, accidental damage like a burst pipe is usually covered. With ${w.heavyRainDays} heavy-rain days a year here, the gaps that matter most are basement water: sewer and sump backups need a water backup endorsement, and surface flooding or groundwater needs a separate flood policy.`,
        `A burst pipe or a failed water heater is usually covered. Rain-driven basement water usually isn't, unless you added water backup coverage, and floodwater needs a flood policy. ${cal.rain} are when ${c.short} County gets the most heavy rain.`,
        `Pipe bursts and appliance failures are typically covered; slow leaks, seepage and floodwater typically aren't. Ask your agent about water backup coverage, given ${w.heavyRainDays} heavy-rain days a year here.`,
      ]),
    },
    {
      q: `How fast does mold start in a ${c.short} County home?`,
      a: `The EPA advises drying wet materials within 24 to 48 hours. In ${cal.wettestMonth}, the county's wettest month, and on the ${w.muggyNights} muggy summer ${w.muggyNights === 1 ? "night" : "nights"} a year when lows stay at 65°F or above, basements dry slowly on their own, so start fans and dehumidifiers the same day.`,
    },
  ];
}

/** One local line per triage option, from the county's own numbers. */
export function triageLocal(c: County): Record<string, string> {
  const w = c.weather!;
  const cal = seasonCalendar(c);
  return {
    pipe: pick(c, "tp", [
      `${c.short} County averages ${pl(w.pipeRiskNights, "night")} a year at 20°F or colder, mostly ${cal.freeze}, and ${pct(c.builtPre1960Pct)} of its homes predate 1960.`,
      `With ${pct(c.builtPre1960Pct)} of homes built before 1960 and about ${w.pipeRiskNights} hard-freeze ${w.pipeRiskNights === 1 ? "night" : "nights"} a year, frozen and split pipes are a major winter risk in the county.`,
      `Pipes freeze in ${c.short} County on about ${pl(w.pipeRiskNights, "night")} a year, mostly ${cal.freeze}. Older homes, ${pct(c.builtPre1960Pct)} of the stock here, are most at risk.`,
    ]),
    basement: pick(c, "tb", [
      `Heavy rain days of an inch or more come about ${w.heavyRainDays === 1 ? "once" : `${w.heavyRainDays} times`} a year here, most often in ${cal.rainPeak}. A sump pump that hasn't run since last season is a common weak point.`,
      `${cal.rainPeak} brings the most downpours to ${c.short} County, part of ${w.heavyRainDays} heavy-rain days a year. Check the sump first.`,
      `Basements flood here mostly in ${cal.rainPeak}. ${c.short} County averages ${w.heavyRainDays} days a year with an inch of rain or more.`,
    ]),
    sewage: pick(c, "ts", [
      `Backups often follow heavy rain, which ${c.short} County gets about ${w.heavyRainDays} days a year, when storm water overloads sewer mains and pushes up through basement floor drains.`,
      `${pct(c.builtPre1960Pct)} of homes here predate 1960, when clay and cast iron sewer laterals were standard. Roots and cracks in those lines are a common cause of backups.`,
      `Sewage backups in ${c.short} County spike on heavy-rain days, about ${w.heavyRainDays} a year, when sewer mains fill up and water backs up through floor drains.`,
    ]),
    roof: pick(c, "tr", [
      `${c.short} County's wettest day in the ${w.period} record brought ${w.wettestDay} inches${w.freezeThawDays >= 20 ? `, and about ${pl(w.freezeThawDays, "freeze-thaw day")} a year mean ice dams in some winters` : ""}.`,
      `Roof leaks here come from summer downpours${w.freezeThawDays >= 20 ? ` and, with about ${pl(w.freezeThawDays, "freeze-thaw day")} a year, from winter ice dams` : ""}. Most show up as ceiling stains in the room below.`,
      `In ${c.short} County, ${w.wettestDay} inches fell on the wettest day of the ${w.period} record. Storms like that, and ice dams in snowy winters, cause most roof leaks.`,
    ]),
    fire: `${pct(c.heatWoodPct + c.heatPropanePct)} of occupied homes in ${c.short} County heat mainly with wood or propane, ${compare(c.heatWoodPct + c.heatPropanePct, round1(STATE.heatWoodPct + STATE.heatPropanePct), "%", 0.1)}.`,
    mold: pick(c, "tm", [
      `About ${pl(w.muggyNights, "night")} a year here stay at 65°F or warmer, so basements and crawl spaces can grow mold even without a leak.`,
      `Muggy summer nights, lows of 65°F or more, come about ${w.muggyNights === 1 ? "once" : `${w.muggyNights} times`} a year in ${c.short} County. Mold after a leak spreads especially quickly from June through August.`,
      `With ${w.muggyNights} muggy ${w.muggyNights === 1 ? "night" : "nights"} a year, mold in ${c.short} County can appear within days of a leak. Dry first, then clean.`,
    ]),
  };
}

function round1(n: number) { return Math.round(n * 10) / 10; }

/** How this county compares with its neighbors. */
export function neighborContrast(c: County, neighbors: County[]) {
  const withW = neighbors.filter((n) => n.weather);
  const parts: string[] = [];
  if (withW.length) {
    const colder = withW.filter((n) => n.weather!.pipeRiskNights > c.weather!.pipeRiskNights).map((n) => n.short);
    const wetter = withW.filter((n) => n.weather!.heavyRainDays > c.weather!.heavyRainDays).map((n) => n.short);
    parts.push(
      colder.length === 0
        ? `${c.short} gets more pipe-freeze nights than any of its neighbors.`
        : colder.length === withW.length
          ? `Every neighboring county gets more pipe-freeze nights than ${c.short}.`
          : `${list(colder)} ${colder.length === 1 ? "gets" : "get"} more pipe-freeze nights than ${c.short}.`,
    );
    if (wetter.length === 0) parts.push(`It also has the most heavy-rain days in its area.`);
    else if (wetter.length === withW.length) parts.push(`All of its neighbors see more heavy-rain days.`);
  }
  const older = [...neighbors].sort((a, b) => b.builtPre1980Pct - a.builtPre1980Pct)[0];
  if (older) {
    parts.push(
      older.builtPre1980Pct > c.builtPre1980Pct
        ? `${older.short} County has the oldest housing nearby, with ${pct(older.builtPre1980Pct)} of homes built before 1980.`
        : `Its housing is the oldest in the area by share of homes built before 1980.`,
    );
  }
  return parts.join(" ");
}
