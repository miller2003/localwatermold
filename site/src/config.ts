import { S } from "./lib/state";
// Everything that changes between preview and launch lives here.

type Mode = "preview" | "live";
type Hours = "24-7" | "business";
interface Line {
  // Numbers from the pay-per-call network, format "+13305550100". Leave null until a buyer answers calls.
  phones: { default: string | null; byCounty: Record<string, string> };
  // "24-7" shows the call button around the clock; "business" adds an after-hours note.
  // Only use "24-7" when the buyer really answers around the clock: some offers then require an
  // availability disclaimer. `window` is the plain-English answering window shown for "business".
  hours: { default: Hours; byCounty: Record<string, Hours>; window?: string };
}

// Site-wide switch. "preview": noindex everywhere, robots.txt blocks crawlers, phone shows as not live.
// "live": indexable, real numbers shown for states that have a line below.
const MODE: Mode = "live";
const CONTACT_EMAIL = "hello@localwatermold.com";

// Call lines per state. States not listed here show the call line as not live yet.
const NO_LINE: Line = { phones: { default: null, byCounty: {} }, hours: { default: "business", byCounty: {} } };
const LINES: Record<string, Line> = {
  // Example: oh: { phones: { default: "+16145550100", byCounty: {} }, hours: { default: "business", byCounty: {}, window: "10am to 2am Eastern, 7 days a week" } },
};
const L = (S && LINES[S.key]) || NO_LINE;

export const SITE = {
  brand: "Local Water & Mold",
  domain: "localwatermold.com",
  // How people type the name into a search box. Search engines split "localwatermold" into
  // "local water mold" and can match it to restoration companies with those words in their name,
  // so the joined spelling appears in visible text, JSON-LD alternateName and llms.txt.
  brandJoined: "LocalWaterMold",
  alternateNames: ["LocalWaterMold", "Local Water Mold", "localwatermold.com"],
  founded: "2026",
  // Official profiles (Facebook, Instagram, LinkedIn, YouTube, Bing Places, …) as full URLs once they
  // exist. They become Organization sameAs, which ties the name to this site in knowledge graphs.
  sameAs: [] as string[],
  // The name covers water and mold; the tagline adds fire and basements, and says we connect
  // people with local companies rather than doing the work.
  tagline: "Water damage, mold, fire and flooded basement help from local restoration pros",
  taglineShort: "Water · Mold · Fire · Basements",
  state: S?.name,
  stateAbbr: S?.abbr,
  launchMode: MODE,
  contactEmail: CONTACT_EMAIL,
  // First publication date of the guides, and the date they were last checked against sources.
  published: "2026-10-21",
  lastReviewed: "2026-10-21",
  // Set once a real, consenting reviewer is on board. Never invent one.
  reviewer: null as null | { name: string; credential: string; bio: string },
};

export const PHONES = L.phones;
export const CALL_HOURS = L.hours;

// Any state's line, for site-wide output that covers every state (the agent API in the national build).
export const lineFor = (stateKey: string): Line => LINES[stateKey] || NO_LINE;
export const callLineLive = (line: Line) => MODE === "live" && !!line.phones.default;

export function phoneFor(countySlug?: string): string | null {
  return (countySlug && PHONES.byCounty[countySlug]) || PHONES.default;
}

export function formatPhone(e164: string): string {
  const d = e164.replace(/\D/g, "").slice(-10);
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}
