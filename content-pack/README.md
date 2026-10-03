# FAR Out content pack — state

**As of 2026-10-03.** `mode: topic` with extension files. Standard files follow `docs/CONTENT-PACK.md`; the extension schema is in `source/far-out-pack-schema.md` (draft v0.1).

## What is here

| File | Entries | Covers |
|---|---|---|
| `references.yaml` | 1,145 (1–488 SBIR/STTR; 501–929 set-asides and vehicles; 1001–1546 partnering) | three of four families |
| `programs.yaml` | 71 | SBIR/STTR programs and front doors; contract vehicles (MAS, OASIS+, Polaris, Alliant 3, STARS III, VETS 2, ASTRO, SEWP VI, NITAAC, SeaPort-NxG, DISA SETI) |
| `gates.yaml` | 48 | registrations, portals, reps and certs, Section 889/FASCSA, NIST 800-171, CMMC (rule and July 2026 suspension separate), accounting, clearance, export, bonding, labor, payment; subcontracting reporting, FFATA, JV agreement, affiliation, recertification; prompt/accelerated payment, Miller Act, flow-downs, data rights as a sub, disputes with a prime |
| `help.yaml` | 47 | help-organisation types; 32 outreach and matchmaking programs; 7 directories of primes |
| `certifications.yaml` | 7 | 8(a), HUBZone, WOSB/EDWOSB, VOSB/SDVOSB, SDB, size standards, affiliation |
| `routes.yaml` | 31 | set-aside and sole-source mechanisms, simplified and commercial buys, order set-asides, protests; subcontracting, finding subcontract work, teaming, JVs, SBA and DoD mentor-protégé, five agency MPPs; CRADA, PIA, licensing, Manufacturing USA, STTR research partner, EPA |
| `buyers.yaml` | 32 | CFO Act agencies and DoD components: small-business office and forecast page |
| `mechanics.yaml` | 5 | reading SAM.gov, market research, responding, payment, capability statement |
| `primes.yaml` | 24 | large primes: supplier portal, what registration asks, liaison, programs, selection and forecast statements, exactly as each company states them |
| `queries.yaml` | 481 | every search run, with links returned; renders on `/methods` |
| `todo.yaml` | 558 | gaps, conflicts, unverified pages, rechecks, cross-slice duplicates |

Not yet written: `manifest.yaml`, `scope.yaml`, `review.md`, `glossary.yaml`, `concepts/`, `figures.yaml`, the pathfinder data; the OTs/CSOs family; routes for the SBIR family.

**Standing rule (2026-10-03):** cite codified FAR section numbers as primary; record the FAR-overhaul deviation numbering under `pending_changes` with status `class-deviation` and date.

## Before anything here is published

1. **Every entry is `recheck: true`.** Pages were read through a summarising fetch layer; quotes and figures must be checked against the live page. 20 quotes exceed the 25-word limit and must be cut.
2. **Cross-slice duplicates:** 105 URLs appear in two or more slices (todo `t-M…`) and 4 program ids were drafted twice (`navy-stp`, `army-sbir-catalyst`, `apfit`, `dow-art`; todo `t-P…`). Merge before numbering is frozen.
3. **11 references are `verified: false`** and may not carry a claim.
4. **Known source conflicts** are kept in records with both figures cited; resolutions go in `todo.yaml`.
