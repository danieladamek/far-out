# FAR Out content pack — state

**As of 2026-10-03 (late night).** `mode: topic` with extension files. Standard files follow `docs/CONTENT-PACK.md`; the extension schema is in `source/far-out-pack-schema.md` (draft v0.1). All four route families are swept, the pack is consolidated, and the live recheck has run over all 1,324 cited references (6 remain host-blocked).

## What is here

| File | Entries | Covers |
|---|---|---|
| `references.yaml` | 1,427 after URL dedupe, numbered 1–1427 (each carries `prev_n` from the sweep numbering; `source/recheck/nmap-old-to-new.json` maps them) | all four families |
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
| `todo.yaml` | 478 | gaps, conflicts, unverified pages; `tr-*` items are facts the recheck contradicted; duplicate-URL and id-collision items are resolved and removed |

Not yet written: `manifest.yaml`, `scope.yaml`, `review.md`, `glossary.yaml`, `concepts/`, `figures.yaml`, routes for the SBIR/STTR family, the pathfinder data, `changes.yaml` entries for the first three families.

**Standing rules (2026-10-03):** cite codified FAR/DFARS section numbers as primary and record the overhaul's deviation numbering under `pending_changes` as `class-deviation` with date · where official sources disagree, carry both figures with citations and a `conflicts` line · secondary sources never carry a fact alone · a front door whose latest primary source predates 2025 or whose site does not resolve is `status: unconfirmed`.

## Recheck state

**Consolidation (done):** 1,603 → 1,427 references by URL; sequential renumbering with `prev_n`; 12 colliding record ids merged (programs: apfit, navy-stp, army-sbir-catalyst, dow-art, diu-cso, diu-onramp-hubs, tradewinds-solutions-marketplace, sofwerx, navalx-tech-bridges; gates: sam-registration, recertification-size-status; routes: subcontracting-under-prime-plan — field differences recorded in each record's `conflicts`); situation tags normalised; 53 quotes trimmed to 25 words.

**Live recheck (2026-10-03/04):** 1,318 of the 1,324 cited references were read against the live page (`recheck: false`, with `rechecked` date). Results: 1,581 quotes kept as verbatim, 63 removed to `dropped_quotes`; 4,208 facts confirmed, 32 contradicted (tagged in `key_facts` and listed as `tr-*` todos), 120 not found on the page (tagged `[unconfirmed on recheck]`). **6 cited references are host-blocked** (media.defense.gov PDF, one eCFR section that returned 503, a NAVSEA PDF, a navy.mil story, an ARPA-E file, a HigherGov page) and stay `recheck: true`, listed in `source/recheck/recheck-remaining.json`. 103 uncited references were not rechecked. Protocol and all ten verdict files are in `source/recheck/`.

**Caveats that remain:** the recheck itself read pages through the same summarising fetch layer, with a targeted confirm/deny prompt; agents overrode the layer's label where its own excerpt contradicted it and noted each case. Long regulations and PDFs were often partial. Statute mirrors (Cornell LII) still need reading on govinfo/uscode when those sites return. Unread primaries: DoWI 5000.02 (April 2026), DoDI 5000.81, the Nov 2025 WAS memo, the OT Guide beyond p.35, the FY2026 NDAA body beyond Title XVIII, dodsbirsttr.mil, BARDA's main pages, SAM.gov notice pages.

**Contradictions worth the author's eye (from `tr-*` todos):** SBA's 8(a) page still prints $7M/$4.5M sole-source ceilings against the FAR's $8.5M/$5.5M; Army TABA is up to $50,000 per firm across Phase II projects, not per project; 8(a) STARS III option period ends 2028-07-01 on GSA's ordering guide; NIH NOT-OD-26-073 was rescinded 2026-07-10; SBA's mentor-protégé agreements file is now dated 2026-10-01; ITES-3S lists 114 vendors; the AAF prototype-OT page names the SPE/agency director, not a service secretary, for approvals up to $100M; GAO-24-106225 has 4 closed / 9 open recommendations; the DoDI 5000.75 category definitions differ from the record.
