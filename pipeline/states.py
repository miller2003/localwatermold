"""Per-state settings shared by every pipeline script. Add a state here to expand.

`priority` orders the weather backfill: freeze-belt states with older housing and many mid-size
counties first, then storm and humidity states, then the most competitive large markets.
"""
import argparse
from pathlib import Path

HERE = Path(__file__).parent

_E, _C = "America/New_York", "America/Chicago"
STATES = {
    "oh": {"fips": "39", "name": "Ohio", "tz": _E, "priority": 1},
    "pa": {"fips": "42", "name": "Pennsylvania", "tz": _E, "priority": 2},
    "mi": {"fips": "26", "name": "Michigan", "tz": "America/Detroit", "priority": 3},
    "in": {"fips": "18", "name": "Indiana", "tz": "America/Indiana/Indianapolis", "priority": 4},
    "ky": {"fips": "21", "name": "Kentucky", "tz": _E, "priority": 5},
    "wv": {"fips": "54", "name": "West Virginia", "tz": _E, "priority": 6},
    "tn": {"fips": "47", "name": "Tennessee", "tz": _C, "priority": 7},
    "mo": {"fips": "29", "name": "Missouri", "tz": _C, "priority": 8},
    "ia": {"fips": "19", "name": "Iowa", "tz": _C, "priority": 9},
    "wi": {"fips": "55", "name": "Wisconsin", "tz": _C, "priority": 10},
    "ny": {"fips": "36", "name": "New York", "tz": _E, "priority": 11},
    "il": {"fips": "17", "name": "Illinois", "tz": _C, "priority": 12},
    "mn": {"fips": "27", "name": "Minnesota", "tz": _C, "priority": 13},
    "nc": {"fips": "37", "name": "North Carolina", "tz": _E, "priority": 14},
    "va": {"fips": "51", "name": "Virginia", "tz": _E, "priority": 15},
    "al": {"fips": "01", "name": "Alabama", "tz": _C, "priority": 16},
    "ms": {"fips": "28", "name": "Mississippi", "tz": _C, "priority": 17},
    "ar": {"fips": "05", "name": "Arkansas", "tz": _C, "priority": 18},
    "ok": {"fips": "40", "name": "Oklahoma", "tz": _C, "priority": 19},
    "ks": {"fips": "20", "name": "Kansas", "tz": _C, "priority": 20},
    "ne": {"fips": "31", "name": "Nebraska", "tz": _C, "priority": 21},
    "ga": {"fips": "13", "name": "Georgia", "tz": _E, "priority": 22},
    "sc": {"fips": "45", "name": "South Carolina", "tz": _E, "priority": 23},
    "md": {"fips": "24", "name": "Maryland", "tz": _E, "priority": 24},
    "tx": {"fips": "48", "name": "Texas", "tz": _C, "priority": 25},
}


def state_from_args(extra=None):
    p = argparse.ArgumentParser()
    p.add_argument("--state", required=True, choices=sorted(STATES))
    for args, kwargs in extra or []:
        p.add_argument(*args, **kwargs)
    a = p.parse_args()
    st = dict(STATES[a.state], abbr=a.state)
    st["raw"] = HERE / "raw" / a.state
    st["out"] = HERE / "out" / a.state
    st["site"] = HERE.parent / "site" / "src" / "data" / a.state
    for k in ("raw", "out", "site"):
        st[k].mkdir(parents=True, exist_ok=True)
    return st, a


if __name__ == "__main__":
    # Print state keys in backfill priority order (used by run_all.sh).
    print(" ".join(sorted(STATES, key=lambda k: STATES[k]["priority"])))
