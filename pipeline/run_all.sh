#!/usr/bin/env bash
# Run pipeline stages for every state in priority order.
#   bash run_all.sh base      Census + Wikidata + county records (no API key needed)
#   bash run_all.sh weather   download NOAA nClimGrid-Daily county weather 2015-2024 (all states at once)
#   bash run_all.sh site      derive site data + share images for states that have weather
set -u
cd "$(dirname "$0")"
export PYTHONIOENCODING=utf-8
STAGE="${1:-base}"
if [ "$STAGE" = "weather" ]; then python fetch_nclimgrid.py | tail -1; exit 0; fi
for st in $(python states.py); do
  case "$STAGE" in
    base)
      if [ ! -f "out/$st/counties_base.json" ]; then
        echo "== $st base"
        python fetch_census.py --state "$st" >/dev/null && python fetch_wikidata.py --state "$st" && python build_counties.py --state "$st" | tail -1
      fi ;;
    site)
      if [ -f "out/$st/counties_base.json" ]; then
        echo "== $st site"; python derive.py --state "$st" | tail -1 && python make_og.py --state "$st" >/dev/null
      fi ;;
  esac
done
