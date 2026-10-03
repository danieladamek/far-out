# FAR Out content pack — state

**As of 2026-10-03.** `mode: topic` with extension files. Standard files follow `docs/CONTENT-PACK.md`; the extension schema is in `source/far-out-pack-schema.md` (draft v0.1).

## What is here

| File | Entries | Covers |
|---|---|---|
| `references.yaml` | 309 (n 1–121 law + DoD; n 301–488 civilian + after-award) | SBIR/STTR family only |
| `programs.yaml` | 59 | government-wide mechanisms, DoD components and front doors, 14 civilian agency programs, transition programs, related R&D routes, SBA support |
| `gates.yaml` | 11 | registrations and portals, data-rights marking, security disclosure, proposal cap |
| `help.yaml` | 8 | help-organisation types |
| `queries.yaml` | 137 | every search run, with links returned; renders on `/methods` |
| `todo.yaml` | 224 | gaps, conflicts, unverified pages, rechecks, cross-slice duplicates |

Not yet written: `manifest.yaml`, `scope.yaml`, `review.md`, `glossary.yaml`, `concepts/`, `figures.yaml`, `routes.yaml`, `certifications.yaml`, `buyers.yaml`, the pathfinder data; the other three route families (OTs/CSOs, set-asides and vehicles, primes and partnering).

## Before anything here is published

1. **Every entry is `recheck: true`.** Pages were read through a summarising fetch layer; quotes and figures must be checked against the live page. 20 quotes exceed the 25-word limit and must be cut.
2. **Cross-slice duplicates:** 32 URLs appear in two slices (todo `t-M…`) and 4 program ids were drafted twice (`navy-stp`, `army-sbir-catalyst`, `apfit`, `dow-art`; todo `t-P…`). Merge before numbering is frozen.
3. **7 references are `verified: false`** and may not carry a claim.
4. **Known source conflicts** are kept in records with both figures cited; resolutions go in `todo.yaml`.
