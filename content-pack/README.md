# FAR Out content pack — state

**As of 2026-10-03.** `mode: topic` with extension files. Standard files follow `docs/CONTENT-PACK.md`; the extension schema is in `source/far-out-pack-schema.md` (draft v0.1).

## What is here

| File | Entries | Covers |
|---|---|---|
| `references.yaml` | 737 (n 1–121 and 301–488 SBIR/STTR; 501–699 and 701–929 set-asides and vehicles) | SBIR/STTR; set-asides, certifications, FAR mechanics, vehicles, gates, buyers |
| `programs.yaml` | 71 | SBIR/STTR programs and front doors; contract vehicles (MAS, OASIS+, Polaris, Alliant 3, STARS III, VETS 2, ASTRO, SEWP VI, NITAAC, SeaPort-NxG, DISA SETI) |
| `gates.yaml` | 35 | registrations, portals, reps and certs, Section 889/FASCSA, NIST 800-171, CMMC (rule and July 2026 suspension stated separately), accounting, clearance, export, bonding, labor, payment |
| `help.yaml` | 8 | help-organisation types |
| `certifications.yaml` | 7 | 8(a), HUBZone, WOSB/EDWOSB, VOSB/SDVOSB, SDB, size standards, affiliation |
| `routes.yaml` | 14 | set-aside and sole-source mechanisms, simplified and commercial buys, order set-asides, subcontracting; protest routes |
| `buyers.yaml` | 32 | CFO Act agencies and DoD components: small-business office and forecast page |
| `mechanics.yaml` | 4 | reading SAM.gov, market research, responding, payment |
| `queries.yaml` | 288 | every search run, with links returned; renders on `/methods` |
| `todo.yaml` | 374 | gaps, conflicts, unverified pages, rechecks, cross-slice duplicates |

Not yet written: `manifest.yaml`, `scope.yaml`, `review.md`, `glossary.yaml`, `concepts/`, `figures.yaml`, the pathfinder data; the OTs/CSOs and primes-and-partnering families; routes for the SBIR family.

**Standing rule (2026-10-03):** cite codified FAR section numbers as primary; record the FAR-overhaul deviation numbering under `pending_changes` with status `class-deviation` and date.

## Before anything here is published

1. **Every entry is `recheck: true`.** Pages were read through a summarising fetch layer; quotes and figures must be checked against the live page. 20 quotes exceed the 25-word limit and must be cut.
2. **Cross-slice duplicates:** 46 URLs appear in two slices (todo `t-M…`) and 4 program ids were drafted twice (`navy-stp`, `army-sbir-catalyst`, `apfit`, `dow-art`; todo `t-P…`). Merge before numbering is frozen.
3. **11 references are `verified: false`** and may not carry a claim.
4. **Known source conflicts** are kept in records with both figures cited; resolutions go in `todo.yaml`.
