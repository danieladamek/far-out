# FAR Out content pack — state

**As of 2026-10-03 (night).** `mode: topic` with extension files. Standard files follow `docs/CONTENT-PACK.md`; the extension schema is in `source/far-out-pack-schema.md` (draft v0.1). All four route families are swept; the recheck pass has not run.

## What is here

| File | Entries | Covers |
|---|---|---|
| `references.yaml` | 1,603 (1–488 SBIR/STTR · 501–929 set-asides and vehicles · 1001–1546 partnering · 1601–2141 OTs, consortia, CSOs, pathways) | all four families; 1,479 primary, 124 secondary, 20 unverified |
| `routes.yaml` | 43 | set-aside and sole-source mechanisms, simplified and commercial buys, protests; subcontracting, teaming, JVs, SBA and DoD mentor-protégé, agency MPPs; CRADA, PIA, licensing, Manufacturing USA, STTR partner; prototype, research and follow-on OTs, defense CSO, BAA, consortium membership, civilian OT authorities |
| `programs.yaml` | 134 | SBIR/STTR programs and front doors; contract vehicles; 33 OT consortia and 4 managers; CSO and innovation front doors; civilian agreement routes |
| `certifications.yaml` | 8 | 8(a), HUBZone, WOSB/EDWOSB, VOSB/SDVOSB, SDB, size standards, affiliation, nontraditional defense contractor |
| `gates.yaml` | 60 | registrations and portals, reps and certs, Section 889/FASCSA, NIST 800-171, CMMC (rule and suspension separate), accounting, clearance, export, bonding, labor, payment; subcontracting reporting, FFATA, JV agreement, affiliation, recertification; prompt/accelerated payment, Miller Act, flow-downs, data rights as a sub, disputes with a prime; OT protests, IP in OTs, OT thresholds, OT agreement structure, milestones and cost share, audit, OT payment, OT cybersecurity, consortium project agreement, prize eligibility |
| `buyers.yaml` | 40 | six AAF pathways, the civilian procurement model, the grants model; 32 agency small-business offices with forecast pages |
| `help.yaml` | 47 | help-organisation types, outreach and matchmaking, directories of primes |
| `primes.yaml` | 24 | large primes' supplier pages, as each company states them |
| `mechanics.yaml` | 6 | reading SAM.gov, market research, responding, payment, capability statement, OTs in public data |
| `changes.yaml` | 21 | dated entries for `/changes` (OT family only so far; other families' changes still sit in `pending_changes` fields) |
| `queries.yaml` | 674 | every search run, with links returned; renders on `/methods` |
| `todo.yaml` | 733 | gaps, conflicts, unverified pages, rechecks, cross-slice duplicates, id collisions |

Not yet written: `manifest.yaml`, `scope.yaml`, `review.md`, `glossary.yaml`, `concepts/`, `figures.yaml`, routes for the SBIR/STTR family, the pathfinder data, `changes.yaml` entries for the first three families.

**Standing rules (2026-10-03):** cite codified FAR/DFARS section numbers as primary and record the overhaul's deviation numbering under `pending_changes` as `class-deviation` with date · where official sources disagree, carry both figures with citations and a `conflicts` line · secondary sources never carry a fact alone · a front door whose latest primary source predates 2025 or whose site does not resolve is `status: unconfirmed`.

## Before anything here is published — the recheck pass

1. **Every reference is `recheck: true`.** Pages were read through a summarising fetch layer; quotes and figures must be checked against the live page. Several extraction errors were caught by re-fetching (2 CFR 200 thresholds, a SAT figure, acronym expansions, an invented consortium table); assume more exist. About 50 quotes exceed the 25-word limit.
2. **157 URLs are duplicated across slices** (todo `t-M…`) and several record ids collide across slices (`t-P…`): `sam-registration` ×3, `navy-stp`, `army-sbir-catalyst`, `apfit`, `dow-art`, `diu-cso`, `diu-onramp-hubs`, `tradewinds-solutions-marketplace`, `sofwerx`, `navalx-tech-bridges`, `subcontracting-under-prime-plan`, `recertification-size-status`. Merge before numbering is frozen.
3. **20 references are `verified: false`** and may not carry a claim.
4. **Source-kind rule for mirrors** is inconsistent (Cornell LII statute pages and CRS mirrors are `primary` in some slices, `secondary` in others). Rule to apply: a statute read on a mirror is `primary` for the text but `recheck` against govinfo/uscode when those come back.
5. **Situation tags** are inconsistent (`first-awards` vs `first-awards-grow`); gate id vocabularies differ between slices; `date_note`, `status`, `status_note`, `basis`, `note`, `conflicts` keys were added beyond the schema and should be ratified into it.
6. **Known unread primaries:** DoWI 5000.02 (April 2026), DoDI 5000.81, the Nov 2025 WAS memo, the OT Guide beyond p.35 and Appendix F, the FY2026 NDAA body beyond Title XVIII on govinfo, dodsbirsttr.mil entirely, BARDA's main pages, SAM.gov notice pages.
