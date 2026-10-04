# FAR Out content pack — extension schema (draft v0.1, 2026-10-03)

FAR Out is `mode: topic` with extension files. Standard files follow docs/CONTENT-PACK.md (manifest.yaml, scope.yaml, review.md, references.yaml, glossary.yaml, concepts/, figures.yaml, todo.yaml). The extension files below are specific to this app.

## references.yaml (topic-mode schema + web-source keys)

```yaml
- n: 1                       # unique integer; the [n] used in prose
  key: PL119-83               # short stable key, CamelCase/digits, unique
  tier: seminal               # seminal = statute, public law, SBA Policy Directive, CFR/FAR/DFARS text
                              # classic  = standing guidance older than the window (pre-2024) the field still leans on
                              # current  = agency pages, solicitations, notices, memos dated 2024–2026
                              # background = tutorials, CRS/GAO reports, glossaries, press releases
  citation: 'Publisher. Title. Date. URL'      # web-style, as the page identifies itself
  url: https://…
  year: 2026                  # REQUIRED; publication year, or year accessed if undated (then date_note)
  published: '2026-04-13'     # ISO date or 'unknown'
  accessed: '2026-10-03'
  publisher: U.S. Small Business Administration
  source_kind: primary        # primary | secondary (law firm, consultant, trade press) — secondary never carries a fact alone
  read: full                  # full | partial | not-fetched (not-fetched => verified: false and a todo entry)
  summary: >                  # 2–4 sentences in the builder's words; full 3–6 for seminal
  key_facts:                  # exact numbers and dates as the page gives them
  - …
  quotes:                     # ≤25 words each, verbatim as retrieved; flagged for re-check against the live page
  - '…'
  role_here: data-source      # support | method | contrast | prior-result | data-source | background
  role_note: '…'
  cited_in: []                # record ids and review sections; filled during assembly
  verified: true              # true only when a human-readable page was actually read this sweep
  recheck: true               # quotes came through a summarising fetch layer; verify before publication
```

## programs.yaml (programs, vehicles and front doors)

```yaml
- id: nih-sbir-grants         # kebab-case, unique
  name: NIH SBIR/STTR grants
  family: sbir-sttr           # sbir-sttr | ot-cso | setaside-vehicle | partnering
  kind: program               # program | vehicle | front-door | transition
  owner: National Institutes of Health (HHS)
  agency: HHS
  defense: false
  what: >                     # plain layer, 2–4 sentences, every sentence cited [n]
  funds_or_buys: grants       # grants | contracts | both | other-transaction | procurement
  eligibility:                # bullet facts, each cited
  - '… [n]'
  cycle:                      # how and when it opens, as currently posted, cited
    pattern: '… [n]'
    current_solicitations:
    - id: PA-27-100
      opens: '2026-08-05'
      closes: '2027-04-05'
      note: '… [n]'
  awards:                     # amounts and durations exactly as stated, cited
  - phase: I
    amount: '$323,090'
    duration: '…'
    cite: [n]
  steps:                      # the official steps to submit, each cited
  - '… [n]'
  portal: https://…
  registrations: [sam-uei, sbc-control-id, era-commons]   # gate ids
  gates: [sam-registration, sbir-registration]            # gate ids
  situations: [have-technology]                           # pathfinder tags
  modifiers: {rd: true, product: false, service: false}
  pending_changes:
  - status: proposed | announced | class-deviation | final | pending-implementation
    date: '2026-07-10'
    text: '… [n]'
  distinctive: '… as the agency itself frames it [n]'
  official_url: https://…
  as_of: '2026-10-03'
  sources: [n, n, n]
  conflicts:                  # where fetched sources disagree; resolved in todo.yaml
  - '… [n] vs [n]'
```

## routes.yaml — written later from programs (one per entry pattern; family-level)
## gates.yaml, certifications.yaml, buyers.yaml, help.yaml — same field style: id, name, what (cited), applies_when, steps, official_url, pending_changes, as_of, sources
## scope.yaml adds `queries:` — every query run: text, engine, hits (links returned), date, slice

## todo.yaml

```yaml
- id: t-001
  kind: conflict | unverified | gap | recheck
  about: programs/army-sbir
  text: 'Army pages disagree on Phase I ceiling: $250K [n] vs $300K [n].'
  owner: author
```
