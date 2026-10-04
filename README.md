# FAR Out

Every route into federal work for a small business, with the gates on each and where the opportunities appear.

FAR Out is a static web app: a pathfinder that ranks routes by how many of a firm's answers they match, a catalogue of 49 routes in four families (SBIR/STTR and innovation front doors; set-asides, certifications and contract vehicles; primes and partnering; Other Transactions, consortia and CSOs), the gates in front of them, the programs, vehicles and consortia they run through, the buyer's side of the table, a dated ledger of what changed in 2025–26, an opportunity search over a daily harvest of SAM.gov and Grants.gov, and a live USAspending view of who wins and who subcontracts. Behind the catalogue is a commissioned guide with every claim cited.

**Live:** https://danieladamek.github.io/far-out/

> **Not legal, financial or compliance advice.** A commissioned guide written by an AI research builder from public government sources; not peer reviewed, not official, no affiliation with any firm or agency. Rules, thresholds and dates change; every record shows its own as-of date (the sweep closed 2026-10-03) and links to its governing text.

## Quick start

On Daniel's machine the app opens by double-clicking **`App Shortcuts/▶ Open FAR Out.command`** (in the team folder). It runs `npm ci` when `node_modules` is missing, `npm run build` when `src`, `public` or `index.html` is newer than the last build, and `npm run preview -- --port 4188 --strictPort`; the app is then at **http://localhost:4188/**.

By hand:

```bash
npm ci
npm run build:content   # validate the content pack, link terms, emit src/data/*.json (exits 1 on pack errors; see below)
npm run build           # tsc + vite build → dist/ (BASE_PATH=/far-out/ for Pages)
npm run preview -- --port 4188 --strictPort
```

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build:content` | `scripts/build-content.ts`: validate + link + emit; writes `content-pack/BUILD-ERRORS.md` on errors |
| `npm run build` | type-check and build `dist/` (with `404.html` for deep links) |
| `npm run harvest` | `scripts/harvest/run-all.mjs`: SAM.gov extract + Grants.gov → `public/data/opportunities/` (not committed) |
| `npm run harvest:fixture` | write the small offline fixture harvest into `public/data/opportunities/` |
| `npm test` | Vitest: pack schemas, term matcher, parser, figure data, pathfinder ranker, /find filters, harvest parsers, notepad |
| `npm run test:e2e` | Playwright against `dist/` on :4173 (`BX_PORT` overrides); build with the fixture harvest first |

A local build does not need the harvest: without `public/data/opportunities/`, `/find` says so and offers the deep links to SAM.gov, Grants.gov, SBIR.gov and the DoD SBIR/STTR portal.

## Editing the content pack

`content-pack/` is the only source of content. The standard files follow `docs/CONTENT-PACK.md` (topic mode); the extension files (`routes`, `programs`, `certifications`, `gates`, `buyers`, `help`, `primes`, `mechanics`, `changes`, `queries`, `pathfinder`) follow `content-pack/EXTENSIONS.md`.

1. Edit the YAML or Markdown in `content-pack/`.
2. `npm run build:content`. It fails loudly — non-zero exit and a list — on a schema violation, an unresolved `[n]`, an unknown term, concept, route, gate or program id, a `situations` tag outside the five, a `find_filter.feed` outside `sam | grants | both | none`, a missing data file, an ambiguous term variant, or any block of 25 words or more with no `[n]` and no `<!-- framing -->` marker (in `review.md`, a concept body, or a record's prose fields). Errors go to `content-pack/BUILD-ERRORS.md` and appear on `/methods`; the app still builds from whatever validated.
3. Never fix an uncited block by adding a citation, and never re-point an unknown id at a similar one: correct the pack.
4. `npm run build`, then check `/methods` for the counts.

`src/data/*.json`, `public/provenance.json` and `public/figures/` are generated and committed, so a fresh clone builds without re-running the content build.

## The harvest

`scripts/harvest/sam.mjs` streams the public SAM.gov contract-opportunities CSV (≈210 MB, never loaded whole), keeps active notices whose response deadline has not passed (or early notices posted within 120 days), slims each to 17 fields, tags SBIR/STTR titles, and shards by NAICS sector (≤ 1.5 MB per file). `scripts/harvest/grants.mjs` pages the Grants.gov `search2` API for posted and forecasted opportunities. Both write `public/data/opportunities/manifest.json` with the harvest time, counts and any failure; a failed feed leaves the other in place and `/find` names the stale one. The GitHub Actions deploy runs the harvest on every push and daily at 09:17 UTC; the output is built into the Pages deployment and never committed.

## Provenance

- The guide, the records, the glossary, the 101s, the figures and the reference summaries were written by the Manuscript Interrogator (builder v0.9) from 1,427 public sources; 1,318 were rechecked against the live page. The app renders them as written: it structures and links, it does not paraphrase or add facts. Gaps appear as amber `TODO(author)` markers, listed on `/methods`.
- The pathfinder's ranking is `pathfinder.rule` exactly: matched situation tags count 2, matched modifiers 1, score 0 hidden. Nothing is labelled best or recommended.
- The gate groups on `/gates` are derived from each gate's own fields at build time; the rule and the words that placed each gate are shown.
- No analytics, accounts or server. Pathfinder answers, notes and saved searches live in `localStorage`. Two things leave the browser, and each page says so: `/find` loads this site's own harvested files, and `/partners` queries `api.usaspending.gov`.
- The notepad is ported from `ptsd-inflammation-critique` (APP-SPEC §3.1), with anchors extended to every record type; with `notes_storage: browser` it saves to this browser only and says so.

## Layout

```
content-pack/            the input (committed)
scripts/build-content.ts validate + link + emit (scripts/lib/: schemas, parser, linker, figures, records)
scripts/harvest/         SAM.gov + Grants.gov harvest, fixture generator
scripts/probe-sources.mjs feed probe (exits non-zero on any non-2xx/206)
src/data/                generated JSON (committed)
src/pages/               one file per route
src/components/          reader, records, figures, notepad, ui
tests/unit, tests/e2e    Vitest, Playwright; tests/fixtures/ minipack, harvest, opportunities
.github/workflows/       deploy.yml (test → harvest → build → Pages), probe-sources.yml
```
