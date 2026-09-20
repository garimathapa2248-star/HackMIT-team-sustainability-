#!/usr/bin/env bash
# Bootstrap the signal parse on the AWS box (i7i.12xlarge, 48 vCPU).
# Idempotent: safe to re-run. Run from the repo root, inside tmux.
#
#   tmux new -s signal
#   bash signals/bootstrap_aws.sh
#
# Put heavy data on the big NVMe mount, NOT the root volume. Find it with:
#   df -h        # then: export DATA_DIR=/mnt/<nvme>/rootledger_data
set -euo pipefail

DATA_DIR="${DATA_DIR:-$PWD/data}"          # override to the NVMe mount
ISD_HISTORY="$DATA_DIR/isd-history.csv"
STATIONS_JSON="$DATA_DIR/stations.json"
BBOX="${BBOX:-nepal_adjacent}"             # nepal_adjacent | hma | koshi
FIRST_YEAR="${FIRST_YEAR:-1980}"
LAST_YEAR="${LAST_YEAR:-2024}"

echo ">> DATA_DIR=$DATA_DIR   BBOX=$BBOX   years=$FIRST_YEAR-$LAST_YEAR"
mkdir -p "$DATA_DIR"

# --- 1. Python env ------------------------------------------------------------
if [ ! -d .venv ]; then
  python3 -m venv .venv
fi
# shellcheck disable=SC1091
source .venv/bin/activate
pip install -q --upgrade pip
pip install -q -r signals/requirements.txt

# --- 2. Station metadata ------------------------------------------------------
if [ ! -f "$ISD_HISTORY" ]; then
  echo ">> fetching isd-history.csv"
  aws s3 cp --no-sign-request s3://noaa-global-hourly-pds/isd-history.csv "$ISD_HISTORY" 2>/dev/null \
    || curl -fsSL https://www.ncei.noaa.gov/pub/data/noaa/isd-history.csv -o "$ISD_HISTORY"
fi

# --- 3. Select the stations for this region -----------------------------------
python3 -m signals.stations \
  --isd-history "$ISD_HISTORY" \
  --bbox "$BBOX" \
  --first-year "$FIRST_YEAR" --last-year "$LAST_YEAR" \
  --output "$STATIONS_JSON"

# --- 4. (Optional) Voloridge's own fetch tools --------------------------------
if [ ! -d src ]; then
  aws s3 sync --no-sign-request s3://voloridge-hack-mit-2026/src ./src 2>/dev/null \
    && echo ">> synced Voloridge src tools" || echo ">> (Voloridge src not synced; using S3 streaming path)"
fi

cat <<EOF

>> Bootstrap complete.
   Stations selected -> $STATIONS_JSON

   Run the parse (streams only the needed station-years from S3, 46 workers):

     source .venv/bin/activate
     python3 -m signals.scale \\
       --s3-bucket noaa-global-hourly-pds \\
       --cache-dir "$DATA_DIR/isd_cache" \\
       --stations-json "$STATIONS_JSON" \\
       --first-year $FIRST_YEAR --last-year $LAST_YEAR \\
       --workers 46 \\
       --checkpoint-dir "$DATA_DIR/checkpoints" \\
       --tidy-output "$DATA_DIR/tidy_master.csv" \\
       --output artifacts/signal.json

   Start small (BBOX=nepal_adjacent) to ship signal.json fast, then re-run with
   BBOX=hma for the big station-years number. The parse is resumable.
EOF
