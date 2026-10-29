// Guides that read the same in every state live once at the root, /guides/<slug>/, and every state
// section links to that one copy. That keeps 25 near-identical pages out of the index.
// The national /guides/ index, state guide indexes, sitemaps and llms.txt all read this list.

export type GuideGroup = "emergency" | "damage" | "money";
export interface NationalGuide { slug: string; title: string; note: string; group: GuideGroup }

export const NATIONAL_GUIDES: NationalGuide[] = [
  { slug: "water-damage-mold-emergency", group: "emergency", title: "Water damage or mold emergency: what to do now", note: "The steps to take while you wait for help, and the ones to skip, like bleach." },
  { slug: "roof-leak", group: "emergency", title: "Roof leaking into the house", note: "Catch the water, protect the ceiling, tarp safely and file the claim." },
  { slug: "appliance-leaks", group: "emergency", title: "Washer, dishwasher, fridge and toilet leaks", note: "Which valve to close, and the hoses that fail most." },
  { slug: "water-heater-leaking", group: "emergency", title: "Water heater leaking", note: "Shut it down, find the leak, repair or replace." },
  { slug: "call-insurance-or-restoration-company-first", group: "emergency", title: "Call insurance or a restoration company first?", note: "Why drying can't wait for the adjuster, and a same-day script for both calls." },
  { slug: "small-leak-dry-it-yourself-or-call-a-pro", group: "damage", title: "Small leak: dry it yourself or call a pro?", note: "Five checks: water type, time wet, materials, size and hidden spread." },
  { slug: "mold-after-leak-safe-to-sleep", group: "damage", title: "Found mold after a leak: safe to sleep there?", note: "Who's most at risk, when to sleep elsewhere, and why testing is usually unnecessary." },
  { slug: "water-damage-categories", group: "damage", title: "Clean, gray or black water", note: "The three categories and four classes of water damage." },
  { slug: "signs-of-hidden-water-damage", group: "damage", title: "Signs of hidden water damage", note: "Stains, smells, soft floors and the water meter test." },
  { slug: "how-long-does-water-damage-take-to-dry", group: "damage", title: "How long water damage takes to dry", note: "Typical drying times by material, and what dry really means." },
  { slug: "black-mold", group: "damage", title: "Black mold: what it is and what to do", note: "Why color doesn't matter, health effects, and when testing helps." },
  { slug: "crawl-space-moisture", group: "damage", title: "Crawl space water and mold", note: "Where the water comes from, and vapor barriers vs. encapsulation." },
  { slug: "does-homeowners-insurance-cover-water-damage", group: "money", title: "Does homeowners insurance cover water damage?", note: "Sudden vs. gradual, flood, sewer backup, and mold limits." },
  { slug: "water-damage-restoration-cost", group: "money", title: "What restoration costs", note: "2026 national ranges and what moves them." },
  { slug: "insurance-preferred-vendor-or-own-contractor", group: "money", title: "Insurer's preferred vendor or your own company?", note: "What preferred vendors are, the real trade-offs, and seven questions for either." },
  { slug: "restoration-work-authorization-assignment-of-benefits", group: "money", title: "Before you sign: work authorization or assignment of benefits?", note: "What each document does, the clauses to read, and your right to cancel." },
  { slug: "water-mitigation-bill-too-high", group: "money", title: "Mitigation bill too high, or insurance paid less?", note: "How to read the invoice, the drying logs to ask for, and how disputes get settled." },
];

export const guidePath = (slug: string) => `/guides/${slug}/`;
export const nationalGuide = (slug: string) => NATIONAL_GUIDES.find((g) => g.slug === slug)!;

// Other site-wide reference pages that live at the root.
export const REFERENCE_PAGES = [
  { path: "/guides/", title: "All guides", note: "Every water, mold and fire guide in one place." },
  { path: "/glossary/", title: "Restoration glossary", note: "Plain-English definitions of the terms adjusters and contractors use." },
  { path: "/water-damage-statistics/", title: "Water damage risk by state", note: "Housing age, freeze nights and heavy rain for every state we cover." },
];
