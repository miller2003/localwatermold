"""Fetch FEMA flood insurance claims and disaster declarations and summarize them by county.

Sources (OpenFEMA, public, no key):
  FimaNfipClaims v2                 every NFIP flood insurance claim since 1978, with county FIPS
  DisasterDeclarationsSummaries v2  every federal disaster and emergency declaration, by county
Output: site/src/data/<state>/fema.json, keyed by 5-digit county FIPS.
fema.gov refuses many non-U.S. connections, so this runs in GitHub Actions (.github/workflows/fema.yml).
Usage: python fetch_fema.py --state oh
"""
import datetime as dt
import json
import statistics as st
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter, defaultdict

from states import state_from_args

ST, _ = state_from_args()
ABBR = ST["abbr"].upper()
SITE_DATA = ST["site"]
API = "https://www.fema.gov/api/open/v2"

# Incident types that put water, ice or wind-driven rain into homes.
WATER = {
    "Flood", "Severe Storm", "Severe Storm(s)", "Hurricane", "Tropical Storm", "Tropical Depression",
    "Coastal Storm", "Winter Storm", "Severe Ice Storm", "Snowstorm", "Snow", "Dam/Levee Break",
    "Mud/Landslide", "Typhoon", "Tornado",
}
SKIP = {"Biological"}  # COVID-19 declarations name every county and say nothing about homes


def get(dataset, params, tries=4, allrecords=True):
    extra = {"$allrecords": "true", "$metadata": "off"} if allrecords else {"$metadata": "off"}
    q = urllib.parse.urlencode({**params, **extra}, safe="$,'", quote_via=urllib.parse.quote)
    url = f"{API}/{dataset}?{q}"
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "localwatermold-pipeline"}), timeout=600) as r:
                return json.load(r)[dataset]
        except urllib.error.HTTPError as e:
            err = f"HTTP {e.code} {e.read()[:300].decode(errors='replace')}"
            if e.code in (400, 404):
                break
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as e:
            err = e
        time.sleep(5 * (i + 1))
    raise SystemExit(f"{dataset}: {err} <- {url}")


def fields(dataset, flt):
    """Field names the API actually returns, from one record."""
    rows = get(dataset, {"$filter": flt, "$top": "1"}, allrecords=False)
    return set(rows[0]) if rows else set()


# Net payments are the v2 names; the older amountPaidOn* fields are the fallback.
PAY = [("netBuildingPaymentAmount", "amountPaidOnBuildingClaim"),
       ("netContentsPaymentAmount", "amountPaidOnContentsClaim"),
       ("netIccPaymentAmount", "amountPaidOnIncreasedCostOfComplianceClaim")]
PAY_FIELDS = []


def claims():
    flt = f"state eq '{ABBR}'"
    have = fields("FimaNfipClaims", flt)
    PAY_FIELDS[:] = [a if a in have else b for a, b in PAY if a in have or b in have]
    want = ["countyCode", "yearOfLoss", "dateOfLoss", "floodEvent"] + PAY_FIELDS
    select = [f for f in want if f in have]
    print(f"{ABBR}: claim fields {select}")
    rows = get("FimaNfipClaims", {"$filter": flt, "$select": ",".join(select)})
    print(f"{ABBR}: {len(rows)} NFIP claims")
    return rows


def paid(r):
    return sum(float(r.get(k) or 0) for k in PAY_FIELDS)


def summarize_claims(rows, fips):
    by = defaultdict(list)
    for r in rows:
        if r.get("countyCode") in fips:
            by[r["countyCode"]].append(r)
    last_full = dt.date.today().year - 1
    out = {}
    for f in fips:
        rs = by.get(f, [])
        if not rs:
            out[f] = {"claims": 0}
            continue
        amounts = [paid(r) for r in rs]
        paid_amounts = [a for a in amounts if a > 0]
        years = Counter(int(r["yearOfLoss"]) for r in rs if r.get("yearOfLoss"))
        year_paid = defaultdict(float)
        for r, a in zip(rs, amounts):
            if r.get("yearOfLoss"):
                year_paid[int(r["yearOfLoss"])] += a
        months = [0] * 12
        for r in rs:
            if r.get("dateOfLoss"):
                months[int(r["dateOfLoss"][5:7]) - 1] += 1
        events = Counter()
        event_year = {}
        for r in rs:
            e = (r.get("floodEvent") or "").strip()
            if e and r.get("yearOfLoss") and e.lower() not in ("none", "n/a", "unknown"):
                events[e] += 1
                event_year.setdefault(e, int(r["yearOfLoss"]))
        out[f] = {
            "claims": len(rs),
            "paidClaims": len(paid_amounts),
            "totalPaid": round(sum(paid_amounts)),
            "medianPaid": round(st.median(paid_amounts)) if paid_amounts else 0,
            "firstYear": min(years) if years else None,
            "recent10": sum(n for y, n in years.items() if last_full - 9 <= y <= last_full),
            "recentPeriod": f"{last_full - 9}–{last_full}",
            "monthly": months,
            "topYears": [{"year": y, "claims": n, "paid": round(year_paid[y])} for y, n in years.most_common(3)],
            "topEvents": [{"name": e, "claims": n, "year": event_year[e]} for e, n in events.most_common(3)],
        }
    return out


def summarize_declarations(rows, fips):
    county_of = {f[2:]: f for f in fips}
    by = defaultdict(dict)  # county fips -> disaster number -> record
    for r in rows:
        if r.get("incidentType") in SKIP or r.get("declarationType") not in ("DR", "EM", "FM"):
            continue
        cc = r.get("fipsCountyCode") or ""
        targets = fips if cc == "000" else [county_of[cc]] if cc in county_of else []
        rec = {
            "n": r["disasterNumber"],
            "type": r["declarationType"],
            "incident": r["incidentType"],
            "title": (r.get("declarationTitle") or "").strip().title(),
            "begin": (r.get("incidentBeginDate") or r["declarationDate"])[:10],
            "declared": r["declarationDate"][:10],
            "ia": bool(r.get("ihProgramDeclared") or r.get("iaProgramDeclared")),
            "statewide": cc == "000",
        }
        for f in targets:
            prev = by[f].get(rec["n"])
            if prev:
                prev["ia"] = prev["ia"] or rec["ia"]
                prev["statewide"] = prev["statewide"] and rec["statewide"]
            else:
                by[f][rec["n"]] = dict(rec)
    out = {}
    for f in fips:
        ds = sorted(by.get(f, {}).values(), key=lambda d: d["declared"], reverse=True)
        major = [d for d in ds if d["type"] == "DR"]
        water = [d for d in ds if d["incident"] in WATER and d["type"] in ("DR", "EM")]
        ia = [d for d in major if d["ia"]]
        out[f] = {
            "major": len(major),
            "emergency": sum(d["type"] == "EM" for d in ds),
            "fire": sum(d["type"] == "FM" for d in ds),
            "waterRelated": len(water),
            "since": min(int(d["declared"][:4]) for d in ds) if ds else None,
            "byIncident": dict(Counter(d["incident"] for d in ds if d["type"] in ("DR", "EM")).most_common()),
            "recent": water[:6],
            "lastIA": ia[0] if ia else None,
        }
    return out


def main():
    counties = json.loads((SITE_DATA / "counties.json").read_text(encoding="utf-8"))["counties"]
    fips = [c["fips"] for c in counties]
    nfip = summarize_claims(claims(), fips)
    decl_rows = get("DisasterDeclarationsSummaries", {"$filter": f"state eq '{ABBR}'"})
    print(f"{ABBR}: {len(decl_rows)} declaration rows")
    decl = summarize_declarations(decl_rows, fips)
    meta = {
        "nfipSource": "OpenFEMA FIMA NFIP Redacted Claims v2",
        "declarationSource": "OpenFEMA Disaster Declarations Summaries v2",
        "retrieved": dt.date.today().isoformat(),
    }
    data = {"meta": meta, "counties": {f: {"nfip": nfip[f], "declarations": decl[f]} for f in fips}}
    (SITE_DATA / "fema.json").write_text(json.dumps(data, indent=1), encoding="utf-8")
    with_claims = sum(1 for f in fips if nfip[f]["claims"])
    print(f"{ST['name']}: {with_claims} of {len(fips)} counties have NFIP claims; "
          f"{sum(nfip[f]['claims'] for f in fips)} claims, {sum(decl[f]['major'] for f in fips)} county-level major declarations")


if __name__ == "__main__":
    main()
