import { S } from "./lib/state";
// Everything that changes between preview and launch lives here.

type Mode = "preview" | "live";
type Hours = "24-7" | "business";
interface Line {
  // Numbers from the pay-per-call network, format "+13305550100". Leave null until a buyer answers calls.
  phones: { default: string | null; byCounty: Record<string, string> };
  // "24-7" shows the call button around the clock; "business" adds an after-hours note.
  hours: { default: Hours; byCounty: Record<string, Hours> };
}

// Site-wide switch. "preview": noindex everywhere, robots.txt blocks crawlers, phone shows as not live.
// "live": indexable, real numbers shown for states that have a line below.
const MODE: Mode = "live";
const CONTACT_EMAIL = "hello@localwatermold.com";

// Call lines per state. States not listed here show the call line as not live yet.
const NO_LINE: Line = { phones: { default: null, byCounty: {} }, hours: { default: "24-7", byCounty: {} } };
const LINES: Record<string, Line> = {
  // Example: oh: { phones: { default: "+16145550100", byCounty: {} }, hours: { default: "24-7", byCounty: {} } },
};
const L = (S && LINES[S.key]) || NO_LINE;

export const SITE = {
  brand: "Local Water & Mold",
  domain: "localwatermold.com",
  // The name covers water and mold; the tagline adds fire and basements, and says we connect
  // people with local companies rather than doing the work.
  tagline: "Water damage, mold, fire and flooded basement help from local restoration pros",
  taglineShort: "Water · Mold · Fire · Basements",
  state: S?.name,
  stateAbbr: S?.abbr,
  launchMode: MODE,
  contactEmail: CONTACT_EMAIL,
  lastReviewed: "2026-10-21",
  // Set once a real, consenting reviewer is on board. Never invent one.
  reviewer: null as null | { name: string; credential: string; bio: string },
};

export const PHONES = L.phones;
export const CALL_HOURS = L.hours;

export function phoneFor(countySlug?: string): string | null {
  return (countySlug && PHONES.byCounty[countySlug]) || PHONES.default;
}

export function formatPhone(e164: string): string {
  const d = e164.replace(/\D/g, "").slice(-10);
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}
