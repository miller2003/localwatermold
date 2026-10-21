"""Combine raw sources into one record per county.

Inputs (pipeline/raw/<state>/): Census Reporter ACS + geometry, Wikidata seats/founding/area.
Output: pipeline/out/<state>/counties_base.json. Usage: python build_counties.py --state pa
"""
import json
import re

from shapely.geometry import shape

from states import state_from_args

ST, _ = state_from_args()
RAW, OUT = ST["raw"], ST["out"]
SQKM_TO_SQMI = 0.386102
MIN_POP = 2_000  # too small to carry search demand, and ACS medians are often missing
# New York City boroughs: searched by borough name, not county, and the most competitive market in the US.
EXCLUDE = {"36005", "36047", "36061", "36081", "36085"}


def load(name):
    return json.loads((RAW / name).read_text(encoding="utf-8"))


def merge_acs(files):
    data, release = {}, None
    for f in files:
        j = load(f)
        release = j["release"]
        for geo, tables in j["data"].items():
            data.setdefault(geo, {}).update({t: v["estimate"] for t, v in tables.items()})
    return data, release


def pct(part, whole):
    return round(100 * part / whole, 1) if whole else None


def slugify(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def wikidata():
    return load("wikidata_counties.json")


def main():
    acs, release = merge_acs(["acs_county_0.json", "acs_county_4.json", "acs_county_8.json"])
    geo = load("geo_county.json")["features"]
    wd = wikidata()

    places_acs = load("acs_place.json")
    place_geo = {f["properties"]["geoid"]: f for f in load("geo_place.json")["features"]}

    counties = {}
    for f in geo:
        geoid = f["properties"]["geoid"]
        name = re.sub(r", [A-Z]{2}$", "", f["properties"]["name"])
        if not name.endswith(" County"):
            continue  # skip independent cities and other county equivalents
        if geoid[-5:] in EXCLUDE:
            continue
        if (acs[geoid]["B01003"]["B01003001"] or 0) < MIN_POP:
            continue
        short = name.replace(" County", "")
        e = acs[geoid]
        b25034 = e["B25034"]
        units = e["B25001"]["B25001001"]
        built_pre1980 = sum(b25034[f"B25034{n:03d}"] for n in range(7, 12))
        built_pre1960 = sum(b25034[f"B25034{n:03d}"] for n in range(9, 12))
        built_2000_plus = sum(b25034[f"B25034{n:03d}"] for n in range(2, 5))
        occupied = e["B25003"]["B25003001"]
        fuel = e["B25040"]
        geom = shape(f["geometry"])
        pt = geom.representative_point()
        counties[geoid] = {
            "geoid": geoid,
            "fips": geoid[-5:],
            "name": name,
            "short": short,
            "slug": slugify(short),
            "seat": wd.get(geoid[-5:], {}).get("seat"),
            "founded": wd.get(geoid[-5:], {}).get("founded"),
            "areaSqMi": round(int(f["properties"]["aland"]) / 2_589_988.11) if f["properties"].get("aland") else None,  # TIGER land area
            "lat": round(pt.y, 4),
            "lon": round(pt.x, 4),
            "population": int(e["B01003"]["B01003001"]),
            "medianAge": e["B01002"]["B01002001"],
            "housingUnits": int(units),
            "vacancyPct": pct(e["B25002"]["B25002003"], units),
            "ownerPct": pct(e["B25003"]["B25003002"], occupied),
            "singleFamilyPct": pct(e["B25024"]["B25024002"] + e["B25024"]["B25024003"], units),
            "mobileHomePct": pct(e["B25024"]["B25024010"], units),
            "medianYearBuilt": int(e["B25035"]["B25035001"]) if e["B25035"]["B25035001"] else None,
            "builtPre1960Pct": pct(built_pre1960, units),
            "builtPre1980Pct": pct(built_pre1980, units),
            "built2000PlusPct": pct(built_2000_plus, units),
            "builtBuckets": [
                {"label": "Before 1940", "pct": pct(b25034["B25034011"], units)},
                {"label": "1940–1959", "pct": pct(b25034["B25034009"] + b25034["B25034010"], units)},
                {"label": "1960–1979", "pct": pct(b25034["B25034007"] + b25034["B25034008"], units)},
                {"label": "1980–1999", "pct": pct(b25034["B25034005"] + b25034["B25034006"], units)},
                {"label": "2000 or later", "pct": pct(built_2000_plus, units)},
            ],
            "heatGasPct": pct(fuel["B25040002"], occupied),
            "heatElectricPct": pct(fuel["B25040004"], occupied),
            "heatPropanePct": pct(fuel["B25040003"], occupied),
            "heatWoodPct": pct(fuel["B25040007"], occupied),
            "medianHomeValue": int(e["B25077"]["B25077001"]) if e["B25077"]["B25077001"] else None,
            "medianIncome": int(e["B19013"]["B19013001"]) if e["B19013"]["B19013001"] else None,
            "_geom": geom,
        }

    # Adjacency from shared boundaries.
    items = list(counties.values())
    for a in items:
        a["adjacent"] = sorted(
            b["slug"]
            for b in items
            if b is not a and a["_geom"].buffer(1e-4).intersects(b["_geom"])
            and a["_geom"].buffer(1e-4).intersection(b["_geom"].buffer(1e-4)).length > 0.005
        )

    # Places (cities/villages/CDPs) assigned to the county holding their center point.
    for geoid, tables in places_acs["data"].items():
        if not geoid.startswith("16000US") or geoid not in place_geo:
            continue
        pop = tables["B01003"]["estimate"]["B01003001"]
        pf = place_geo[geoid]
        pname = re.sub(r", [A-Z]{2}$", "", pf["properties"]["name"])
        ppt = shape(pf["geometry"]).representative_point()
        for c in items:
            if c["_geom"].contains(ppt):
                c.setdefault("places", []).append({"name": pname, "population": int(pop)})
                break
    for c in items:
        c["places"] = sorted(c.get("places", []), key=lambda p: -p["population"])[:12]
        del c["_geom"]

    for c in items:
        if not c["seat"] and c["places"]:
            c["seat"] = c["places"][0]["name"]  # fallback: largest community

    base = sorted(items, key=lambda c: c["name"])
    meta = {"acsRelease": release["name"], "acsYears": release["years"], "countyCount": len(base), "state": ST["name"], "stateAbbr": ST["abbr"].upper()}
    (OUT / "counties_base.json").write_text(
        json.dumps({"meta": meta, "counties": base}, indent=1), encoding="utf-8"
    )

    # Weather fetch order: mid-size counties first (best search demand vs competition), then the rest.
    mid = sorted((c for c in base if 40_000 <= c["population"] <= 250_000), key=lambda c: -c["population"])
    rest = sorted((c for c in base if c not in mid), key=lambda c: -c["population"])
    (OUT / "fetch_order.json").write_text(json.dumps([c["slug"] for c in mid + rest], indent=1), encoding="utf-8")

    print(meta)
    missing = [c["short"] for c in base if not c["seat"]]
    print(f"{len(base)} counties, seats missing: {missing or 'none'}, no area: {[c['short'] for c in base if not c['areaSqMi']] or 'none'}")


if __name__ == "__main__":
    main()
