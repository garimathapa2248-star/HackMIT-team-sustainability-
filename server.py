"""Vercel serverless entrypoint.

Vercel runs the API as a Python function next to the static frontend, so both live on one
origin and the browser talks to relative paths. Data comes from the committed `demo_cache/`
(`artifacts/` is gitignored), which the loader already falls back to and which carries the
same frozen values as the local artifacts.
"""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from api.main import app  # noqa: E402,F401  (Vercel's Python runtime looks for `app`)
