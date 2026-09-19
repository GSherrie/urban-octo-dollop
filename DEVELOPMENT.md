# Developing SherPay in VS Code

## One-time setup
1. Unzip `SherPay-complete-project.zip` and **Open Folder** in VS Code (the folder containing this file).
2. Terminal: `cd tests && npm install` (installs jsdom etc. for the QA suite). Nothing else to install — the app itself has zero dependencies and no build step.
3. Optional: `git init && git add -A && git commit -m "SherPay import"` so VS Code's Source Control tab tracks your updates.

## Run & debug
| Action | How |
|---|---|
| Start app with live reload | **Terminal ▸ Run Task… ▸ `Start dev server (live reload)`** (or `node web/scripts/dev-server.js`). Open http://localhost:8000 — every save auto-refreshes the browser. |
| Debug client JS in a real browser | Press **F5 ▸ "Debug SherPay in Chrome"** (or Edge). The task starts the server automatically. Set breakpoints directly in `web/js/*.js` — plain JS, no source maps needed. Console: `window.Store` / `window.UI` expose the whole app state. |
| Debug Node/tests | **F5 ▸ "Debug QA suite (Node)"** or open any test and **F5 ▸ "Debug current JS file"**; breakpoints in `tests/*.js` and in `web/js/store.js` (it runs inside jsdom) work. |
| Run the QA sweep | Task **`Run QA suite`** (88 assertions) or **`Run all tests`** (smoke + UI + suite + mobile). |
| Rebuild single-file app | Task **`Build single-file app`** → writes `SherPay-mobile.html` next to the project root. |
| Refresh native shell | Task **`Sync native www`**, then in `native/`: `npx cap sync` (needs `npm install` there once). |
| Deploy | Task **`Deploy to Vercel (update live app)`** — see "Publishing updates" below for the one-time setup. |

## Publishing updates (keeping sherpay.vercel.app current)
Prerequisite: Node.js installed on your Mac (https://nodejs.org — LTS). The live project **sherpay** already exists on your Vercel account; both routes below update that same project/URL.

**Route 1 — Vercel CLI (simplest start, no GitHub needed)**
1. One time: run task **`Link Vercel project (one-time)`** (or `cd web && npx vercel login && npx vercel link`) → pick your account → pick project **sherpay**.
2. Every update: run task **`Deploy to Vercel (update live app)`** (or `cd web && npx vercel deploy --prod`). Live in ~15 seconds.

**Route 2 — GitHub auto-deploy (recommended long-term)**
1. Push the project to GitHub (see START-HERE ▸ "Put it on GitHub").
2. On https://vercel.com: open project **sherpay** → **Settings ▸ Git ▸ Connect Git Repository** → choose your `sherpay` repo.
3. **Settings ▸ General ▸ Root Directory** → set to `web` (the site lives in that subfolder).
4. From now on, every `git push` (or VS Code ▸ Source Control ▸ Commit + Sync) **automatically redeploys the live app**. Pull requests/branches get free preview URLs.

**After any deploy — cache-bust for phones:** if you changed HTML/CSS/JS, bump the version so installed PWAs pick it up immediately: in `web/index.html` change every `?v=4` → `?v=5`, and in `web/sw.js` change `CACHE = 'sherpay-v4'` → `'sherpay-v5'` and the `?v=4` entries in `CORE`. (Deploy again after bumping.)

**Automatic PWA updates (already wired).** `web/index.html` registers the worker as `sw.js?v=N`
with `updateViaCache: 'none'`, re-checks for a new build whenever the app returns to the foreground,
and reloads once when a new worker takes control — so an installed app can't keep serving an old build.
`web/sw.js` deletes superseded caches on activate. To confirm or force it on a device, open
**Account ▸ About**: it shows the running build (`v2.4.1 · build v12`) next to **Check for updates →
Refresh**, which unregisters the worker, clears its caches and reloads (localStorage data is kept).
The build tag is read from the `?v=` above (or the `sherpay-build` meta in the single-file build), so it
follows the same bump — no second place to edit.

**Deploying the offline single-file copy:** `node scripts/sync-www.js ../dist && cd ../dist && vercel deploy --prod --yes`
ships `web/` plus `SherPay-mobile.html`, which the docs promise at `https://sherpay.vercel.app/SherPay-mobile.html`.
Copy `web/.vercel/` into the target dir first (or link it) so the CLI deploys to the existing project.

## Live-reload details
`web/scripts/dev-server.js` is dependency-free: static server + SSE broadcaster. It injects a tiny
EventSource snippet into HTML responses; any file change under `web/` reloads connected browsers
within ~1s. No cache headers, so you never debug stale code. Production builds are unaffected
(the snippet is only injected by the dev server).

## Where things live
- `web/js/store.js` — data model, money/date utils, totals engine, automations (reminders, recurring), CSV/JSON export. Start here for business logic.
- `web/js/ui.js` — router, shell/nav, icons, modals, toasts, charts, touch/drag assist.
- `web/js/views-*.js` — one file per area (dashboard+invoices+receipt, editor, clients+expenses+time, reports+settings). Each view returns `{title, sub, topActions, html, mount, actions}`; `actions` keys bind to `data-action` attributes (event delegation in `ui.js`).
- `web/styles.css` — design system; mobile breakpoints at 960/760px; print styles at the bottom.
- `native/` — Capacitor shell; web assets live in `native/www`.

## Adding a feature (recipe)
1. New view: add `UI.VIEWS.myview = function(parts){ return {title, html, mount, actions} }` in a views file, then add a nav entry in `ui.js` `NAV` array.
2. New persisted field: extend the object in `store.js` (seed + mutations); `S.save()` persists to localStorage (`sherpay_db_v1`). Bump the key name if you change the schema.
3. New invoice/paper element: edit the template strings in `views-main.js` (`UI.VIEWS.i` / `.r`); print output uses the same markup via `@media print`.
4. Verify: run **Run QA suite**, add assertions to `tests/test-suite.js` for the new behaviour.
5. Ship: rebuild mobile file / sync native / deploy as above; bump `?v=` in `web/index.html` + `CACHE` in `web/sw.js` so phones drop cached assets.

## Gotchas
- Workspace folders named `dist/` or `node_modules/` may be wiped by some cloud sandboxes — keep deployables in `builds/` or regenerate with the tasks.
- The Vercel project link lives in `web/.vercel/project.json` only if you create it (`vercel link`); it is not required for local work.
- iOS camera in the *browser* needs HTTPS or localhost — the dev server on localhost qualifies.
