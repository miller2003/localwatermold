// One site, one section per state at /<slug>/. Each state section is built separately: the active
// state comes from SITE_STATE at build time, and "us" builds the site-wide root pages.
// Everything state-specific (law, regulator, local programs) lives here.

export interface Link { label: string; href: string }
export interface StateConfig {
  key: string;
  abbr: string;
  name: string;
  slug: string;
  regulator: { name: string; phone?: string; url: string; urlLabel: string };
  // Detailed, verified state law. States without these fall back to the generic text below.
  claims?: { citation: string; url: string; bullets: [string, string][]; note: string };
  cancellation?: { law: string; url: string; text: string };
  contractors?: { text: string; link?: Link };
  consumerAgency?: Link;
  sewerPrograms?: string;
  verified: boolean;
}

export const STATES: Record<string, StateConfig> = {
  oh: {
    verified: true,
    key: "oh", abbr: "OH", name: "Ohio", slug: "ohio",
    regulator: { name: "Ohio Department of Insurance", phone: "1-800-686-1526", url: "https://insurance.ohio.gov/", urlLabel: "insurance.ohio.gov" },
    claims: {
      citation: "Ohio Administrative Code 3901-1-54",
      url: "https://codes.ohio.gov/ohio-administrative-code/rule-3901-1-54",
      bullets: [
        ["A decision within 21 days.", "After it receives a properly completed proof of loss, the insurer has 21 days to accept or deny the claim."],
        ["Notice if it needs more time.", "If the investigation needs longer, the insurer has to tell you within that 21-day window, explain why, and then update you in writing at least every 45 days."],
        ["Denials must cite the policy.", "An insurer can't deny a claim based on a provision, condition or exclusion unless the denial refers to it."],
        ["No rejection over the wrong form.", "If the format of the proof of loss matters, the insurer must give you the specific documents and instructions, and can't deny a claim only because you didn't use its usual form."],
      ],
      note: "The rule itself doesn't create a private right to sue.",
    },
    cancellation: {
      law: "Home Solicitation Sales Act",
      url: "https://codes.ohio.gov/ohio-revised-code/chapter-1345",
      text: "Ohio's Home Solicitation Sales Act generally gives you three business days to cancel a contract you signed at home with a seller who came to you, and requires the seller to tell you about that right in writing. There are exceptions. One covers a genuine emergency where you contacted the company yourself and signed a separate, dated statement in your own handwriting waiving the three days, so don't sign one under pressure. Another covers repairs you specifically called the company to your home to do.",
    },
    contractors: { text: "Ohio doesn't issue a statewide license for general residential contractors. Many cities and counties register contractors and require permits for rebuild work like drywall, electrical and plumbing. Ask your building department what applies where you live." },
    consumerAgency: { label: "Ohio Attorney General: Consumer protection", href: "https://www.ohioattorneygeneral.gov/Individuals-and-Families/Consumers" },
    sewerPrograms: "Some utilities run backup programs. In Hamilton County, MSD of Greater Cincinnati's Sewer Backup Program investigates, cleans up, and can reimburse qualifying damage, but you must report within 48 hours of discovery. Columbus's Project Dry Basement pays for an approved backflow device for eligible homes that have had backups. Ask your utility what it offers before you pay for cleanup.",
  },
  pa: {
    verified: true,
    key: "pa", abbr: "PA", name: "Pennsylvania", slug: "pennsylvania",
    regulator: { name: "Pennsylvania Insurance Department", phone: "1-877-881-6388", url: "https://www.pa.gov/agencies/insurance/consumer-help-center/complaints-questions-help.html", urlLabel: "pa.gov/insurance" },
    claims: {
      citation: "31 Pa. Code Chapter 146 (unfair claims settlement practices)",
      url: "https://law.cornell.edu/regulations/pennsylvania/31-Pa-Code-SS-146-7",
      bullets: [
        ["Acknowledgment within 10 working days.", "The insurer must acknowledge your claim and provide the forms and reasonable help you need to file it."],
        ["Investigation within 30 days.", "If the insurer can't finish investigating within 30 days of being notified, it must tell you in writing why it needs more time, and update you every 45 days after that."],
        ["A decision within 15 working days of proof of loss.", "Once it receives properly completed proofs of loss, the insurer has 15 working days to accept or deny, or to explain in writing why it needs more time."],
        ["Denials must be in writing and cite the policy.", "A denial based on a specific provision, condition or exclusion has to refer to it."],
      ],
      note: "",
    },
    cancellation: {
      law: "Home Improvement Consumer Protection Act",
      url: "https://www.attorneygeneral.gov/wp-content/uploads/2025/03/home_improvement_contractor_brochure.pdf",
      text: "Pennsylvania's Home Improvement Consumer Protection Act gives you three business days after signing to cancel a home improvement contract without penalty, and a full refund if work hasn't started. The right doesn't apply in immediate emergencies such as loss of water or power. In April 2026 the Pennsylvania Supreme Court held that a cancellation doesn't have to be in writing. Contracts over $500 must be in writing, and on jobs over $5,000 a contractor can't ask for more than one-third of the price up front.",
    },
    contractors: {
      text: "Pennsylvania requires contractors who do $5,000 or more of home improvement work a year to register with the Attorney General's office, and the registration number must appear on contracts, estimates and ads. You can check a number by calling 1-888-520-6680. Cities and townships also issue permits for rebuild work.",
      link: { label: "Pennsylvania Attorney General: Home improvement contractors", href: "https://www.attorneygeneral.gov/wp-content/uploads/2025/03/home_improvement_contractor_brochure.pdf" },
    },
    consumerAgency: { label: "Pennsylvania Attorney General: Bureau of Consumer Protection (1-800-441-2555)", href: "https://www.attorneygeneral.gov/" },
    sewerPrograms: "Ask your municipal sewer authority whether it has a lateral repair or backup assistance program before you pay for cleanup, and report the backup to them either way.",
  },
  mi: {
    verified: true,
    key: "mi", abbr: "MI", name: "Michigan", slug: "michigan",
    regulator: { name: "Michigan Department of Insurance and Financial Services (DIFS)", phone: "877-999-6442", url: "https://www.michigan.gov/DIFScomplaints", urlLabel: "michigan.gov/DIFScomplaints" },
    claims: {
      citation: "Michigan Compiled Laws 500.2006",
      url: "https://zeus-milenia.legislature.mi.gov/documents/mcl/pdf/MCL-500-2006.pdf",
      bullets: [
        ["What counts as proof, within 30 days.", "Unless it settles sooner, the insurer must tell you in writing what proof of loss it needs within 30 days of receiving your claim."],
        ["Payment within 60 days of proof.", "A claim, or the part of it your proof supports, is timely if it's paid within 60 days after the insurer receives satisfactory proof of loss."],
        ["12% interest when it's late.", "If the insurer pays you late, the benefits carry simple interest at 12% a year from the 60-day mark, unless the claim is reasonably in dispute."],
      ],
      note: "",
    },
    cancellation: {
      law: "Home Solicitation Sales Act",
      url: "https://capitol.legislature.mi.gov/documents/mcl/pdf/MCL-445-112.pdf",
      text: "Michigan's Home Solicitation Sales Act lets you cancel a home solicitation sale until midnight of the third business day after you sign. The emergency exception is narrow: you must have asked for immediate work because of an emergency, and given the seller a separate, dated statement in your own handwriting describing the emergency and waiving the three days. A preprinted waiver in the contract isn't the same thing, so don't sign one under pressure.",
    },
    contractors: {
      text: "Michigan requires a residential builder or maintenance and alteration contractor license from LARA for most residential jobs of $600 or more, including roofing, siding, insulation, carpentry and basement waterproofing. You can look up a license on LARA's website. Local building departments issue the permits.",
      link: { label: "Michigan LARA: Maintenance and alteration contractor licensing", href: "https://www.michigan.gov/lara/bureau-list/bcc/sections/licensing-section/residential-builders/lic-info/maintenance-alteration-contractor-license-information" },
    },
    consumerAgency: { label: "Michigan Attorney General: Consumer protection", href: "https://www.michigan.gov/ag/consumer-protection" },
    sewerPrograms: "Ask your city's sewer or public works department whether it has a backup or backwater valve program before you pay for cleanup, and report the backup to them either way.",
  },
  ny: {
    verified: false, key: "ny", abbr: "NY", name: "New York", slug: "new-york",
    regulator: { name: "New York State Department of Financial Services", url: "https://www.dfs.ny.gov/", urlLabel: "dfs.ny.gov" },
  },
  in: {
    verified: false, key: "in", abbr: "IN", name: "Indiana", slug: "indiana",
    regulator: { name: "Indiana Department of Insurance", url: "https://www.in.gov/idoi/", urlLabel: "in.gov/idoi" },
  },
  il: {
    verified: false, key: "il", abbr: "IL", name: "Illinois", slug: "illinois",
    regulator: { name: "Illinois Department of Insurance", url: "https://idoi.illinois.gov/", urlLabel: "idoi.illinois.gov" },
  },
  wi: {
    verified: false, key: "wi", abbr: "WI", name: "Wisconsin", slug: "wisconsin",
    regulator: { name: "Wisconsin Office of the Commissioner of Insurance", url: "https://oci.wi.gov/", urlLabel: "oci.wi.gov" },
  },
  mn: {
    verified: false, key: "mn", abbr: "MN", name: "Minnesota", slug: "minnesota",
    regulator: { name: "Minnesota Department of Commerce", url: "https://mn.gov/commerce/", urlLabel: "mn.gov/commerce" },
  },
  ia: {
    verified: false, key: "ia", abbr: "IA", name: "Iowa", slug: "iowa",
    regulator: { name: "Iowa Insurance Division", url: "https://iid.iowa.gov/", urlLabel: "iid.iowa.gov" },
  },
  mo: {
    verified: false, key: "mo", abbr: "MO", name: "Missouri", slug: "missouri",
    regulator: { name: "Missouri Department of Commerce and Insurance", url: "https://insurance.mo.gov/", urlLabel: "insurance.mo.gov" },
  },
  ky: {
    verified: false, key: "ky", abbr: "KY", name: "Kentucky", slug: "kentucky",
    regulator: { name: "Kentucky Department of Insurance", url: "https://insurance.ky.gov/", urlLabel: "insurance.ky.gov" },
  },
  tn: {
    verified: false, key: "tn", abbr: "TN", name: "Tennessee", slug: "tennessee",
    regulator: { name: "Tennessee Department of Commerce and Insurance", url: "https://www.tn.gov/commerce.html", urlLabel: "tn.gov/commerce" },
  },
  nc: {
    verified: false, key: "nc", abbr: "NC", name: "North Carolina", slug: "north-carolina",
    regulator: { name: "North Carolina Department of Insurance", url: "https://www.ncdoi.gov/", urlLabel: "ncdoi.gov" },
  },
  va: {
    verified: false, key: "va", abbr: "VA", name: "Virginia", slug: "virginia",
    regulator: { name: "Virginia State Corporation Commission, Bureau of Insurance", url: "https://www.scc.virginia.gov/", urlLabel: "scc.virginia.gov" },
  },
  wv: {
    verified: false, key: "wv", abbr: "WV", name: "West Virginia", slug: "west-virginia",
    regulator: { name: "West Virginia Offices of the Insurance Commissioner", url: "https://www.wvinsurance.gov/", urlLabel: "wvinsurance.gov" },
  },
  ga: {
    verified: false, key: "ga", abbr: "GA", name: "Georgia", slug: "georgia",
    regulator: { name: "Georgia Office of Commissioner of Insurance and Safety Fire", url: "https://oci.georgia.gov/", urlLabel: "oci.georgia.gov" },
  },
  al: {
    verified: false, key: "al", abbr: "AL", name: "Alabama", slug: "alabama",
    regulator: { name: "Alabama Department of Insurance", url: "https://www.aldoi.gov/", urlLabel: "aldoi.gov" },
  },
  sc: {
    verified: false, key: "sc", abbr: "SC", name: "South Carolina", slug: "south-carolina",
    regulator: { name: "South Carolina Department of Insurance", url: "https://doi.sc.gov/", urlLabel: "doi.sc.gov" },
  },
  ms: {
    verified: false, key: "ms", abbr: "MS", name: "Mississippi", slug: "mississippi",
    regulator: { name: "Mississippi Insurance Department", url: "https://www.mid.ms.gov/", urlLabel: "mid.ms.gov" },
  },
  ar: {
    verified: false, key: "ar", abbr: "AR", name: "Arkansas", slug: "arkansas",
    regulator: { name: "Arkansas Insurance Department", url: "https://insurance.arkansas.gov/", urlLabel: "insurance.arkansas.gov" },
  },
  ok: {
    verified: false, key: "ok", abbr: "OK", name: "Oklahoma", slug: "oklahoma",
    regulator: { name: "Oklahoma Insurance Department", url: "https://www.oid.ok.gov/", urlLabel: "oid.ok.gov" },
  },
  ks: {
    verified: false, key: "ks", abbr: "KS", name: "Kansas", slug: "kansas",
    regulator: { name: "Kansas Insurance Department", url: "https://insurance.kansas.gov/", urlLabel: "insurance.kansas.gov" },
  },
  ne: {
    verified: false, key: "ne", abbr: "NE", name: "Nebraska", slug: "nebraska",
    regulator: { name: "Nebraska Department of Insurance", url: "https://doi.nebraska.gov/", urlLabel: "doi.nebraska.gov" },
  },
  tx: {
    verified: false, key: "tx", abbr: "TX", name: "Texas", slug: "texas",
    regulator: { name: "Texas Department of Insurance", url: "https://www.tdi.texas.gov/", urlLabel: "tdi.texas.gov" },
  },
  md: {
    verified: false, key: "md", abbr: "MD", name: "Maryland", slug: "maryland",
    regulator: { name: "Maryland Insurance Administration", url: "https://insurance.maryland.gov/", urlLabel: "insurance.maryland.gov" },
  },
};

export const STATE_KEY = (process.env.SITE_STATE || "oh").toLowerCase();
export const NATIONAL = STATE_KEY === "us";
if (!NATIONAL && !STATES[STATE_KEY]) throw new Error(`Unknown SITE_STATE "${STATE_KEY}". Known: us, ${Object.keys(STATES).join(", ")}`);
// The active state. Undefined in the national build, so root pages must check NATIONAL first.
export const S = STATES[STATE_KEY];
export const ALL_STATES = Object.values(STATES);
/** "a" or "an" before a state name: "an Ohio home", "a Texas home". */
export const an = (word: string) => (/^[aeiou]/i.test(word) ? "an" : "a");

// Generic, nationwide-accurate fallbacks for states without verified detail.
export const FTC_COOLING_OFF: Link = { label: "FTC: The Cooling-Off Rule", href: "https://consumer.ftc.gov/articles/buyers-remorse-ftcs-cooling-rule-may-help" };
export const FIND_AG: Link = { label: "NAAG: Find your state attorney general", href: "https://www.naag.org/find-my-ag/" };

export const claimsGeneric = () =>
  `Like most states, ${S.name} has an unfair claims settlement practices law that sets standards for how promptly insurers must acknowledge, investigate and decide claims. Ask your insurer for its timeline in writing. If it doesn't respond, or doesn't follow your policy, you can file a complaint with the ${S.regulator.name}${S.regulator.phone ? ` at ${S.regulator.phone}` : ""} or through ${S.regulator.urlLabel}.`;

export const cancellationText = () =>
  S.cancellation?.text ??
  "The FTC's Cooling-Off Rule generally gives you until midnight of the third business day to cancel a sale of $25 or more made at your home, and the seller must tell you about that right and give you cancellation forms. If you ask for emergency repairs, the right can be waived only with a separate, dated statement in your own handwriting describing the emergency, so don't sign one under pressure. State law may add more protection.";

export const contractorsText = () =>
  S.contractors?.text ??
  `Licensing rules for contractors in ${S.name} vary by trade and by city or county. Ask for proof of insurance and any license or registration your local building department requires, and check that the company name matches the paperwork and the truck.`;

export const sewerProgramsText = () =>
  S.sewerPrograms ??
  "Ask your city's sewer or public works department whether it has a backup or backwater valve program before you pay for cleanup, and report the backup to them either way.";
