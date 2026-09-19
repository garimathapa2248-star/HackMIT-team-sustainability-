#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

# python3.12-venv is not in the base image and is required to build the venv.
if ! dpkg -s python3.12-venv >/dev/null 2>&1; then
  sudo apt-get update -qq
  sudo apt-get install -y -qq python3.12-venv
fi

# Isolated Python environment for the FastAPI backend, optimizer and signals.
if [ ! -x .venv/bin/python ]; then
  python3 -m venv .venv
fi
.venv/bin/python -m pip install --upgrade pip
.venv/bin/pip install \
  -r optimize/requirements.txt \
  -r api/requirements.txt \
  -r signals/requirements.txt

# MapLibre / React web client.
(cd web && npm ci)
