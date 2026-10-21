"""DEPRECATED: replaced by fetch_nclimgrid.py (NOAA, public domain). Kept for reference only.

Fetch 10 years of daily weather per county (python fetch_weather.py --state pa) from the Open-Meteo archive (ERA5).

Requests are cached in pipeline/raw/weather/ and paced to stay under the free-tier limits.
"""
import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

from states import state_from_args

ST, _ = state_from_args([(["--noncommercial"], {"action": "store_true"})])
CACHE = ST["raw"] / "weather"
CACHE.mkdir(parents=True, exist_ok=True)

START, END = "2015-01-01", "2024-12-31"
DAILY = "temperature_2m_min,temperature_2m_max,precipitation_sum,snowfall_sum,relative_humidity_2m_mean"


# Open-Meteo's free endpoint is licensed for non-commercial use only. This project is commercial,
# so it uses the paid customer endpoint with OPEN_METEO_API_KEY (Professional plan or higher).
_env = Path(__file__).parent / ".env"
if _env.exists():  # simple KEY=value lines; the file stays on this machine
    for _line in _env.read_text(encoding="utf-8").splitlines():
        if "=" in _line and not _line.lstrip().startswith("#"):
            _k, _v = _line.split("=", 1)
            os.environ.setdefault(_k.strip(), _v.strip().strip('"'))
API_KEY = os.environ.get("OPEN_METEO_API_KEY", "").strip()
BASE = "https://customer-archive-api.open-meteo.com/v1/archive" if API_KEY else "https://archive-api.open-meteo.com/v1/archive"


def fetch(c):
    url = (
        f"{BASE}?latitude={c['lat']}&longitude={c['lon']}&start_date={START}&end_date={END}"
        f"&daily={DAILY}&temperature_unit=fahrenheit&precipitation_unit=inch"
        f"&timezone={ST['tz'].replace('/', '%2F')}"
        + (f"&apikey={API_KEY}" if API_KEY else "")
    )
    req = urllib.request.Request(url, headers={"User-Agent": "county-data-pipeline/1.0"})
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.load(r)


def main():
    if not API_KEY and "--noncommercial" not in sys.argv:
        raise SystemExit("Set OPEN_METEO_API_KEY (Professional plan). The free endpoint is non-commercial only.")
    base = {c["slug"]: c for c in json.loads((ST["out"] / "counties_base.json").read_text(encoding="utf-8"))["counties"]}
    order = json.loads((ST["out"] / "fetch_order.json").read_text(encoding="utf-8"))
    todo = [base[s] for s in order if not (CACHE / f"{s}.json").exists()]
    print(f"{len(todo)} counties to fetch", flush=True)
    for c in todo:
        while True:
            try:
                data = fetch(c)
                break
            except urllib.error.HTTPError as e:
                reason = ""
                try:
                    reason = json.loads(e.read().decode("utf-8")).get("reason", "")
                except Exception:  # noqa: BLE001
                    pass
                if e.code != 429:
                    wait = 20
                elif "Daily" in reason:
                    wait = 1800
                elif "Hourly" in reason:
                    wait = 300
                else:
                    wait = 90
                print(f"  {c['slug']}: HTTP {e.code} {reason[:60]} waiting {wait}s", file=sys.stderr, flush=True)
                time.sleep(wait)
            except Exception as e:  # noqa: BLE001
                print(f"  {c['slug']}: {e}, waiting 20s", file=sys.stderr, flush=True)
                time.sleep(20)
        (CACHE / f"{c['slug']}.json").write_text(json.dumps(data), encoding="utf-8")
        print(f"ok {c['slug']}", flush=True)
        time.sleep(1 if API_KEY else 15)
    print("done", flush=True)


if __name__ == "__main__":
    main()
