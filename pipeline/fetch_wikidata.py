"""County seat, founding year and area from Wikidata, keyed by 5-digit county FIPS.

Usage: python fetch_wikidata.py --state pa  ->  raw/<state>/wikidata_counties.json
"""
import json
import urllib.parse
import urllib.request

from states import state_from_args

ST, _ = state_from_args()
QUERY = """
SELECT ?fips ?seatLabel ?inception ?area WHERE {
  ?county wdt:P882 ?fips . FILTER(STRSTARTS(?fips, "%s") && STRLEN(?fips) = 5)
  OPTIONAL { ?county wdt:P36 ?seat . }
  OPTIONAL { ?county wdt:P571 ?inception . }
  OPTIONAL { ?county wdt:P2046 ?area . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}""" % ST["fips"]

req = urllib.request.Request(
    "https://query.wikidata.org/sparql",
    data=urllib.parse.urlencode({"query": QUERY}).encode(),
    headers={"User-Agent": "county-data-pipeline/1.0", "Accept": "application/sparql-results+json"},
)
with urllib.request.urlopen(req, timeout=120) as r:
    rows = json.load(r)["results"]["bindings"]

out = {}
for row in rows:
    v = {k: x["value"] for k, x in row.items()}
    rec = out.setdefault(v["fips"], {"seat": None, "founded": None, "areaKm2": None})
    if v.get("seatLabel") and not rec["seat"] and not v["seatLabel"].startswith("Q"):
        rec["seat"] = v["seatLabel"].split(",")[0]
    if v.get("inception"):
        y = int(v["inception"][:4]) if v["inception"][0] != "-" else None
        if y and (rec["founded"] is None or y < rec["founded"]):
            rec["founded"] = y
    if v.get("area") and rec["areaKm2"] is None:
        rec["areaKm2"] = float(v["area"])

(ST["raw"] / "wikidata_counties.json").write_text(json.dumps(out, indent=1), encoding="utf-8")
print(f"{ST['name']}: {len(out)} FIPS records, {sum(1 for r in out.values() if r['seat'])} with seats")
