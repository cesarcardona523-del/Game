# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install       # once, installs Vitest + jsdom (dev/test tooling only)
npm test          # runs the full test suite (vitest run)
npx vitest run tests/unit/scoring/scoring_test.js   # run a single test file
```

There is no build step and no linter configured. The game itself needs no
tooling to run — open `index.html` directly in a browser, or serve the
directory with any static file server (e.g. `python3 -m http.server`).

## Repo relationship: this is a working copy, not the live site

This repo is a standalone copy of the game, extracted so it can be iterated
on without touching the live site. **It does not sync automatically** with
where it's actually published. As of 2026-08-17 the publish chain is:

```
Game/ (this repo) → copy → CoffeeAPP/public/game/ → `npm run deploy:web`
    (from CoffeeAPP) → paginaweb/coffee-app/game/ → commit+push in paginaweb
    (Vercel auto-deploys)
```

`CoffeeAPP` is a sibling repo (React/Vite SPA, the "Coffee App" wrapper —
methods/recipes/game tabs) and is the source of truth for everything in it
*except* the game itself, which stays authored here. The old path
(`paginaweb/CoffeeShop/`) is retired — it was backed up to
`paginaweb/Backup/coffee-legacy-2026-08-17/` when Coffee App was rebuilt as
a SPA. Copy game files to `CoffeeAPP/public/game/` (excluding
`package.json`, `package-lock.json`, `vitest.config.js`, `tests/`, `docs/`,
`.gitignore`, `skills-lock.json`, `.claude/` — those are dev-only), never to
the old path. Never push in `paginaweb` (or run `deploy:web` in `CoffeeAPP`)
without the user's explicit go-ahead — it's a production site. See the
README's "Publicar en la página web" section and `CoffeeAPP/DEPLOYMENT.md`
for the full checklist.

## Architecture

**No ES6 modules.** Everything loads as classic `<script>` tags in
dependency order (see the list in `index.html`) because `file://` blocks
`import`/`export` via CORS, and the game must run by opening the HTML file
directly — no build step. Classes/functions become global bindings shared
across script tags, same as multiple `<script>` elements in a browser have
always worked. When adding a new module, add its `<script>` tag in
`index.html` **before** any file that references its exports as bare
identifiers.

**Test-only exports, zero effect on the browser.** 7 of the 11 `js/` files
(`recipes.js`, `scoring.js`, `player.js`, `machine.js`, `customers.js`,
`save.js`, `inventory.js`) end with a guarded block:
```js
if (typeof module !== 'undefined' && module.exports) { module.exports = {...}; }
```
This only executes under Node/CommonJS (`module` is undefined in a plain
`<script>` load), so it's invisible to the browser. It exists purely so
Vitest can `require()` these files. `game.js` and `ui.js` are **not**
unit-tested this way — they're tightly coupled to the DOM and other engines
(audio, UI, other stations) by design, and are verified by playing the game
instead (see `docs/qa/qa-plan-maxi-barista-2026-07-29.md` for what's
automated vs. manual, and why).

Because customers.js/machine.js/inventory.js reference `recipes.js`'s
exports (`INGREDIENTS`, `recetasHastaTier`, etc.) as bare globals — matching
how they resolve in the browser's shared script scope — `tests/setup.js`
replicates that by doing `Object.assign(globalThis, require('../js/recipes.js'))`
before any dependent module is required in a test.

**Node's own global `localStorage` shadows jsdom's.** Node 22+ ships an
experimental `localStorage` global that's broken without a CLI flag, and it
takes priority over vitest's jsdom-provided one because vitest only
overrides keys it doesn't already find on Node's global. `tests/setup.js`
force-overrides `globalThis.localStorage` via `globalThis.jsdom.window.localStorage`
to work around this. If save/localStorage tests start failing mysteriously
after a Vitest or Node upgrade, check this first.

Vitest test files mix module systems on purpose: `import { describe, it,
expect } from 'vitest'` (Vitest's own globals require ESM), but
`require('../../../js/whatever.js')` for the actual game modules (CommonJS,
matching the guard pattern above). Don't "fix" this inconsistency — it's
intentional.

**`ui.js` is the only module allowed to touch `document.*`.** `game.js`
decides *what* happened (ingredient added, customer left, leveled up);
`UIController` decides *how it looks*. Keep new features inside this split —
if you're adding DOM manipulation, it belongs in `ui.js`, called from
`game.js`.

**3 parallel prep stations, not 1 global cup.** `Game.estaciones` is an
array of `NUM_ESTACIONES` (3) work slots, each with its own
`EspressoMachine` instance — one station can be mid-brew while another is
being served, with nothing blocked globally. The Zona 2 machine buttons
always act on `estacionEnfocadaId` (whichever station was last clicked);
other stations keep running in the background and show their own
`⏳ Preparando…` badge.

**Scoring is a pure module, orchestration is not.** `scoring.js` holds the
score/reputation/matching formulas (`pasosCoinciden`,
`calcularServirCorrecto`, `calcularServirIncorrecto`) with zero DOM/Player
dependency — they take inputs and return a result object. `game.js` calls
them and applies the returned deltas to `Player`/`UIController`/`AudioEngine`.
When tuning scoring formulas, edit `scoring.js` and its tests, not `game.js`.

**VFX elements are pooled, not recreated.** `ui.js` has an `ElementPool`
class recycling the `<span>` elements behind `mostrarFlotante`,
`mostrarEstrellas`, and `emitirVapor` instead of creating/destroying DOM
nodes per event. The pool self-sizes to peak concurrent usage and plateaus —
don't reintroduce `document.createElement` + `.remove()` for these without
a real reason.

**The no-scroll layout is JS-driven, not pure CSS.** `ajustarEscalaPantalla()`
in `game.js` is a deliberate, commented-in-depth system (not a generic CSS
Grid layout) built because CSS alone couldn't handle the game being embedded
in an `<iframe>` inside the parent site's "Coffee App" (Safari/iOS address
bar quirks, `visualViewport` vs `innerHeight`, etc.). It measures content
height against available height and falls back to `transform: scale()` only
as a last resort. "Modo compacto" (`<700px` width or `<760px` height)
*restyles* first (fewer decorative elements, bigger buttons) rather than
just shrinking, and below 700px the 3 station cards become a horizontal
scroll-snap carousel (one card visible at a time, matching the customer
queue's existing carousel pattern) instead of stacking — this was added
specifically because 3 stacked cards pushed real phone viewports (375×812)
into the `transform:scale()` fallback, shrinking touch targets below 44px.

**Recipe pricing is effort-based, not real-menu-based.** `recipes.js`
prices are calibrated proportional to machine-step count (each machine
ingredient takes a fixed ~2s) plus a small tier multiplier — not "what this
drink costs at a real café." If you add a recipe, price it by counting its
machine-origin steps in `pasos`, not by vibes.

**The `xp` field on recipes is dead data.** Leveling
(`Player.registrarClienteResuelto`) is driven purely by a count of resolved
customers (`CLIENTES_POR_NIVEL` = 10 per level, capped at `NIVEL_MAXIMO` = 4)
— it never reads `xp`. This is a leftover from an older XP-based leveling
system (see the migration logic in `Player.fromJSON`, which clamps legacy
saves). Don't assume `xp` does anything without checking first.

**No canvas/WebGL.** Every visual is DOM + CSS (SVG `<symbol>` sprite for
icons, CSS `@keyframes` for animation). Shader/3D-engine advice doesn't
apply here.

**Leaderboard degrades silently by design.** `leaderboard.js` calls a
Supabase Edge Function belonging to the parent site's shared Supabase
project. If the migration (`supabase/coffee_shop_puntajes.sql`, lives in
`paginaweb`, not this repo) hasn't been run, submit/fetch fail quietly and
the rest of the game keeps working — this is intentional, not a bug to fix.
