"""Download NOAA nClimGrid-Daily county averages (EpiNOAA v1.0.0, scaled) for 2015-2024.

Public domain U.S. government data on the AWS Open Data registry. One parquet file per month
covers every county in the contiguous U.S. Output: pipeline/raw/nclimgrid/YYYYMM.parquet
"""
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

OUT = Path(__file__).parent / "raw" / "nclimgrid"
OUT.mkdir(parents=True, exist_ok=True)
BASE = "https://noaa-nclimgrid-daily-pds.s3.amazonaws.com/EpiNOAA/v1-0-0/parquet/cty"
MONTHS = [(y, m) for y in range(2015, 2025) for m in range(1, 13)]


def get(ym):
    y, m = ym
    name = f"{y}{m:02d}.parquet"
    dest = OUT / name
    if dest.exists() and dest.stat().st_size > 10_000:
        return name, "cached"
    url = f"{BASE}/YEAR={y}/STATUS=scaled/{name}"
    for attempt in range(8):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "county-data-pipeline/1.0"})
            with urllib.request.urlopen(req, timeout=180) as r:
                data = r.read()
            tmp = dest.with_suffix(".part")
            tmp.write_bytes(data)
            tmp.replace(dest)
            return name, "ok"
        except Exception as e:  # noqa: BLE001
            time.sleep(3 * (attempt + 1))
            err = e
    return name, f"FAILED {err}"


with ThreadPoolExecutor(max_workers=8) as pool:
    for name, status in pool.map(get, MONTHS):
        if status != "cached":
            print(status, name, flush=True)
missing = [f"{y}{m:02d}" for y, m in MONTHS if not (OUT / f"{y}{m:02d}.parquet").exists()]
print("done" if not missing else f"missing {missing}")
