"""Fetch ACS 5-year county + place data and county geometry for one state.

Source: Census Reporter API (a mirror of U.S. Census Bureau ACS data).
Outputs cached JSON in pipeline/raw/<state>/. Usage: python fetch_census.py --state pa
"""
import json
import sys
import time
import urllib.request

from states import state_from_args

ST, _ = state_from_args()
STATE_FIPS = ST["fips"]
RAW = ST["raw"]
API = "https://api.censusreporter.org/1.0"

COUNTY_TABLES = [
    "B01003",  # total population
    "B25001",  # housing units
    "B25002",  # occupancy status
    "B25003",  # tenure
    "B25024",  # units in structure
    "B25034",  # year structure built
    "B25035",  # median year structure built
    "B25040",  # house heating fuel
    "B25077",  # median home value
    "B19013",  # median household income
    "B01002",  # median age
]


def get(url, retries=4):
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "county-data-pipeline/1.0"})
            with urllib.request.urlopen(req, timeout=90) as r:
                return json.load(r)
        except Exception as e:  # noqa: BLE001
            print(f"  retry {attempt + 1}: {e}", file=sys.stderr)
            time.sleep(3 * (attempt + 1))
    raise RuntimeError(f"failed: {url}")


def cached(name, url):
    path = RAW / name
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    data = get(url)
    path.write_text(json.dumps(data), encoding="utf-8")
    return data


def main():
    parent = f"04000US{STATE_FIPS}"
    # Census Reporter caps tables per request, so fetch in small batches.
    for i in range(0, len(COUNTY_TABLES), 4):
        batch = ",".join(COUNTY_TABLES[i : i + 4])
        print("county tables", batch)
        cached(f"acs_county_{i}.json", f"{API}/data/show/latest?table_ids={batch}&geo_ids=050|{parent}")

    print("county geometry")
    cached("geo_county.json", f"{API}/geo/show/tiger2024?geo_ids=050|{parent}")

    print("places")
    cached("acs_place.json", f"{API}/data/show/latest?table_ids=B01003&geo_ids=160|{parent}")
    cached("geo_place.json", f"{API}/geo/show/tiger2024?geo_ids=160|{parent}")
    print("done")


if __name__ == "__main__":
    main()
