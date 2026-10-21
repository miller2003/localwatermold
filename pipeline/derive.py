"""Turn raw county + weather data into the JSON the site builds from.

Outputs:
  site/src/data/<state>/counties.json  every county, with weather metrics where fetched
  site/src/data/<state>/map.json       simplified SVG paths for the state map
Usage: python derive.py --state pa
"""
import datetime as dt
import json
import math
import statistics as st
from pathlib import Path

import pandas as pd
from shapely.geometry import shape

from states import state_from_args

ST, _ = state_from_args()
RAW, OUT, SITE_DATA = ST["raw"], ST["out"], ST["site"]

MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def doy_label(doy):
    d = dt.date(2021, 1, 1) + dt.timedelta(days=round(doy) - 1)
    return f"{MONTHS[d.month - 1]} {d.day}"


NCLIM = Path(__file__).parent / "raw" / "nclimgrid"


def load_nclimgrid(state_fips):
    """Daily county averages for one state from NOAA nClimGrid-Daily (EpiNOAA), °F and inches."""
    files = sorted(NCLIM.glob("20[12][0-9][01][0-9].parquet"))
    if len(files) < 120:
        raise SystemExit(f"Expected 120 monthly nClimGrid files in {NCLIM}, found {len(files)}. Run fetch_nclimgrid.py.")
    parts = []
    for f in files:
        df = pd.read_parquet(f, columns=["fips", "date", "tmax", "tmin", "prcp"])
        parts.append(df[df["fips"].str.startswith(state_fips)])
    df = pd.concat(parts, ignore_index=True).drop_duplicates(subset=["fips", "date"], keep="last")
    for col in ("tmax", "tmin", "prcp"):
        df[col] = pd.to_numeric(df[col], errors="coerce")
        df.loc[df[col] <= -999, col] = float("nan")  # -999.99 marks padding rows
    df = df.dropna(subset=["date", "tmax", "tmin"])
    df["tmax"] = df["tmax"] * 9 / 5 + 32
    df["tmin"] = df["tmin"] * 9 / 5 + 32
    df["prcp"] = df["prcp"] / 25.4
    return {fips: g.sort_values("date").reset_index(drop=True) for fips, g in df.groupby("fips")}


def weather_metrics(g):
    days = g["date"].dt.date.tolist()
    tmin, tmax, rain = g["tmin"], g["tmax"], g["prcp"].fillna(0)
    years = sorted({x.year for x in days})
    n = len(years)
    month = g["date"].dt.month - 1

    def per_year(mask, digits=1):
        v = mask.sum() / n
        return int(round(v)) if digits == 0 else round(float(v), digits)

    freeze = tmin <= 32
    heavy = rain >= 1.0
    monthly_freeze = [round(float(freeze[month == m].sum()) / n, 1) for m in range(12)]
    monthly_heavy = [round(float(heavy[month == m].sum()) / n, 2) for m in range(12)]
    monthly_rain = [round(float(rain[month == m].sum()) / n, 2) for m in range(12)]

    # Longest run of days that never got above freezing.
    best, run, best_end = 0, 0, None
    for i, v in enumerate((tmax <= 32).tolist()):
        run = run + 1 if v else 0
        if run > best:
            best, best_end = run, days[i]

    ci, wi = int(tmin.idxmin()), int(rain.idxmax())
    roll3 = rain.rolling(3).sum()
    r3 = int(roll3.idxmax())

    first_fall, last_spring = [], []
    for y in years:
        yr = g["date"].dt.year == y
        fall = g[yr & (g["date"].dt.month >= 7) & freeze]
        spring = g[yr & (g["date"].dt.month < 7) & freeze]
        if len(fall):
            first_fall.append(fall["date"].iloc[0].timetuple().tm_yday)
        if len(spring):
            last_spring.append(spring["date"].iloc[-1].timetuple().tm_yday)

    return {
        "period": f"{years[0]}–{years[-1]}",
        "freezeNights": per_year(freeze, 0),
        "pipeRiskNights": per_year(tmin <= 20, 0),
        "belowZeroNights": per_year(tmin <= 0),
        "iceDays": per_year(tmax <= 32, 0),
        "freezeThawDays": per_year(freeze & (tmax > 32), 0),
        "muggyNights": per_year(tmin >= 65, 0),
        "longestIceStreak": best,
        "longestIceStreakEnd": best_end.isoformat() if best_end else None,
        "coldestTemp": int(round(float(tmin[ci]))),
        "coldestDate": days[ci].isoformat(),
        "annualPrecip": round(float(rain.sum()) / n, 1),
        "heavyRainDays": per_year(heavy),
        "wettestDay": round(float(rain[wi]), 2),
        "wettestDate": days[wi].isoformat(),
        "max3DayRain": round(float(roll3[r3]), 2),
        "max3DayEnd": days[r3].isoformat(),
        "avgFirstFreeze": doy_label(st.mean(first_fall)) if first_fall else None,
        "avgLastFreeze": doy_label(st.mean(last_spring)) if last_spring else None,
        "monthlyFreeze": monthly_freeze,
        "monthlyHeavyRain": monthly_heavy,
        "monthlyRain": monthly_rain,
    }


def svg_paths(features):
    lats = [b for f in features for b in (f["geom"].bounds[1], f["geom"].bounds[3])]
    lat0 = (min(lats) + max(lats)) / 2
    k = math.cos(math.radians(lat0))
    geoms = {f["slug"]: f["geom"].simplify(0.006, preserve_topology=True) for f in features}
    xs, ys = [], []
    for g in geoms.values():
        minx, miny, maxx, maxy = g.bounds
        xs += [minx * k, maxx * k]
        ys += [miny, maxy]
    minx, maxx, miny, maxy = min(xs), max(xs), min(ys), max(ys)
    width = 400
    scale = width / (maxx - minx)
    height = round((maxy - miny) * scale)

    def ring(coords):
        pts = [f"{(x * k - minx) * scale:.1f},{(maxy - y) * scale:.1f}" for x, y in coords]
        return "M" + "L".join(pts) + "Z"

    out = {}
    for slug, g in geoms.items():
        polys = [g] if g.geom_type == "Polygon" else list(g.geoms)
        out[slug] = "".join(ring(p.exterior.coords) for p in polys)
    centers = {}
    for slug, g in geoms.items():
        p = g.representative_point()
        centers[slug] = [round((p.x * k - minx) * scale, 1), round((maxy - p.y) * scale, 1)]
    return {"viewBox": f"0 0 {width} {height}", "paths": out, "centers": centers}


def main():
    base = json.loads((OUT / "counties_base.json").read_text(encoding="utf-8"))
    counties = base["counties"]

    # Every county with weather data gets a page.
    wx = load_nclimgrid(ST["fips"])
    for c in counties:
        g = wx.get(c["fips"])
        c["pilot"] = g is not None and len(g) > 3000
        if c["pilot"]:
            c["weather"] = weather_metrics(g)
    pilot = [c["slug"] for c in counties if c["pilot"]]

    def med(key, src):
        vals = [x[key] for x in src if x.get(key) is not None]
        return round(st.median(vals), 1)

    state = {k: med(k, counties) for k in [
        "builtPre1960Pct", "builtPre1980Pct", "built2000PlusPct", "medianYearBuilt", "ownerPct",
        "vacancyPct", "mobileHomePct", "heatPropanePct", "heatWoodPct", "heatElectricPct",
        "medianHomeValue", "medianIncome", "medianAge",
    ]}
    pw = [c["weather"] for c in counties if c["pilot"]]
    if not pw:
        raise SystemExit("No nClimGrid weather for this state.")
    state["weather"] = {k: med(k, pw) for k in [
        "freezeNights", "pipeRiskNights", "belowZeroNights", "iceDays", "annualPrecip",
        "heavyRainDays", "freezeThawDays", "muggyNights", "max3DayRain",
    ]}
    state["population"] = sum(c["population"] for c in counties)
    state["housingUnits"] = sum(c["housingUnits"] for c in counties)

    meta = {
        **base["meta"],
        "weatherSource": "NOAA nClimGrid-Daily county averages (EpiNOAA)",
        "weatherPeriod": pw[0]["period"],
        "boundarySource": "U.S. Census Bureau TIGER boundaries via Census Reporter",
        "generated": dt.date.today().isoformat(),
    }
    (SITE_DATA / "counties.json").write_text(
        json.dumps({"meta": meta, "state": state, "pilot": pilot, "counties": counties}, indent=1),
        encoding="utf-8",
    )

    geo = json.loads((RAW / "geo_county.json").read_text(encoding="utf-8"))["features"]
    slug_by_geoid = {c["geoid"]: c["slug"] for c in counties}
    feats = [{"slug": slug_by_geoid.get(f["properties"]["geoid"], "_other_" + f["properties"]["geoid"]), "geom": shape(f["geometry"])} for f in geo]
    (SITE_DATA / "map.json").write_text(json.dumps(svg_paths(feats)), encoding="utf-8")

    print("state medians:", state)
    print(f"{ST['name']}: {len(pilot)} of {len(counties)} counties have weather and get pages")


if __name__ == "__main__":
    main()
