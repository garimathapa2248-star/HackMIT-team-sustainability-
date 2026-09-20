# Deploying RootLedger to Vercel

The frontend and the API deploy together as one Vercel project, on one origin:

- `web/` builds with Vite to static files (served from the CDN).
- `server.py` runs `api.main:app` as a Python serverless function.
- The browser calls relative paths (`/plan?city=koshi`), so there is no CORS hop and no
  hardcoded backend URL in the bundle.

Data comes from the committed **`demo_cache/`**. `artifacts/` is gitignored, and the loader
already falls back to `demo_cache/`, which was checked value-by-value against `artifacts/` —
same 62 sites, $1.984M, 26,306 people-risk, CSI 0.053 / 0.067 / 0.088, 7.75 years.

## Files that make this work

| File | Purpose |
|---|---|
| `vercel.json` | Two builds (static + Python), and routes that send only real API paths to the function |
| `server.py` | ASGI entrypoint; re-exports `api.main:app` |
| `requirements.txt` | `fastapi`, `pydantic`, `numpy` — nothing heavy loads at import |
| `.vercelignore` | Keeps `.env`, `artifacts/`, `data/`, `vendor/` and `node_modules` out of the upload |

The API base is decided in `web/src/api.ts`: a production build defaults to the same origin,
a dev server defaults to `http://127.0.0.1:8000`, and an explicit `VITE_API_URL` overrides both.

## Deploy

```bash
vercel login
```

Then, from `rootledger/`:

```bash
vercel --prod
```

Accept the defaults when it asks to link the project; the root directory is `rootledger/`
(where `vercel.json` lives), not `web/`.

## One environment variable

AskSprout needs the OpenRouter key. It is **not** in the upload (`.env` is ignored), so set it
on the project:

```bash
vercel env add OPENROUTER_API_KEY production
```

Paste the value from your local `.env` when prompted. Optionally also:

```bash
vercel env add ROOTLEDGER_MODEL production
```

with the value `openrouter/free`. Redeploy after adding them.

Without the key, `/ask` still answers — it falls back to the backend's regex agent, which only
reads numbers off disk. Nothing is invented either way.

## What behaves differently once deployed

- **`POST /optimize` cannot write.** Vercel's filesystem is read-only outside `/tmp`, so a live
  re-solve will fail at the save step. The API catches it and returns the saved plan with
  `data_status: "cached fallback"`, and the UI shows "Saved plan". The budget slider does not
  use this endpoint at all — it steps through `plan.frontier`, which is already solved — so the
  demo path is unaffected. The opt-in "Run a new solve" checkbox is the only way to reach it.
- **`/ask` is slow on a cold start.** Free OpenRouter models take ~10–40s and the function has a
  60s ceiling (`maxDuration` in `vercel.json`). The client waits 45s. If it times out the UI
  says the service did not respond rather than showing a guess.
- **Everything else is identical**, including the generated markdown briefs and the PDF, which
  the function renders on request.

## Verifying a deployment

```bash
curl -s https://<your-deployment>.vercel.app/health
curl -s "https://<your-deployment>.vercel.app/plan?city=koshi" | head -c 300
```

`/health` must return `{"ok":true}`. If the site shows the "Backend offline" screen, the
function is not answering — check `vercel logs <deployment-url>`.

## Testing the deployed layout locally first

`npm run dev` in `web/` talks to a separate uvicorn on `:8000`, which is *not* how production
works. To exercise the real same-origin arrangement before deploying, build the frontend and
serve both from one process:

```bash
cd web && npm run build && cd ..
python3 -c "
import sys; sys.path.insert(0,'.')
from pathlib import Path
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from api.main import app
DIST = Path('web/dist')
@app.get('/{p:path}', include_in_schema=False)
async def spa(p: str):
    f = DIST / p
    return FileResponse(f if p and f.is_file() else DIST / 'index.html')
app.mount('/assets', StaticFiles(directory=DIST/'assets'))
import uvicorn; uvicorn.run(app, port=8099)
"
```

Then open <http://127.0.0.1:8099>. This is the arrangement that was used to verify the build.
