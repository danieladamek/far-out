---
id: reading-a-sam-notice
title: Reading a SAM.gov notice
one_liner: 'A SAM.gov notice is a short record: a type code, a set-aside code, an industry code, an active flag
  and a response deadline.'
why_here: The guide's opportunity search shows these fields, and SBIR topics, grants and consortium requests are
  published elsewhere.
prerequisites:
- how-a-buy-happens
- what-a-set-aside-is
terms:
- sam-gov
- sam-notice-codes
- sources-sought
- presolicitation
- solicitation
- synopsis
- set-aside
- naics
- size-standard
- simplified-acquisition-threshold
- sbir
- other-transaction
- consortium
- grants-gov
- dsip
figures: []
further_reading:
- title: SAM.gov, Contract Opportunities
  url: https://sam.gov/content/opportunities
  kind: guide
- title: GSA, SAM.gov Get Opportunities Public API
  url: https://open.gsa.gov/api/get-opportunities-public-api/
  kind: guide
- title: FAR 5.203, Publicizing and response time
  url: https://www.acquisition.gov/far/5.203
  kind: regulation
- title: FAR 5.207, Preparation and transmittal of synopses
  url: https://www.acquisition.gov/far/5.207
  kind: regulation
- title: data.gov, Contract Opportunities from SAM.gov
  url: https://catalog.data.gov/dataset/contract-opportunities-from-sam-gov
  kind: guide
self_check:
- q: Which of these is a notice-type code in the SAM.gov public API?
  options:
  - RFI, for request for information
  - r, for Sources Sought
  - RFP, for request for proposal
  - q, for quotation
  answer: 1
  explanation: The API documentation lists nine type codes, among them r for Sources Sought; RFI is not one of them
    [567].
- q: 'What does active: No mean on a notice?'
  options:
  - The notice is archived
  - The contract has been awarded
  - The set-aside was withdrawn
  - The firm viewing it is not registered
  answer: 0
  explanation: In the API documentation, active Yes means an active opportunity and No means an archived one [567].
- q: Where is a Department of War SBIR or STTR proposal submitted?
  options:
  - Through SAM.gov contract opportunities
  - Through Grants.gov
  - Through the DSIP portal
  - By email to the contracting officer
  answer: 2
  explanation: The department's opportunities page says all of its SBIR and STTR proposals must be submitted electronically
    through the Defense SBIR/STTR Innovation Portal (DSIP) [52].
---

## What it is

SAM.gov is the governmentwide point of entry, the single place where federal business opportunities greater than $25,000 can be reached by the public [418]. The site's own definition is short: "Contract opportunities are procurement notices from federal contracting offices." [569] Anyone can search them without an account [569]. Each notice carries one of nine type codes: p for presolicitation, r for sources sought, s for special notice, o for solicitation, k for combined synopsis/solicitation, a for award notice, u for justification, g for sale of surplus property and i for intent to bundle [567]. "RFI" is not among them [567].

Four more fields do most of the work. The set-aside field holds one of eighteen codes, among them SBA, SBP, 8A, HZC, SDVOSBC, WOSB and EDWOSB; this guide reads SBA as a total small-business set-aside and SBP as a partial one, readings that are its own and are flagged for checking against the API page [567]. The FAR requires the synopsis to identify the type of set-aside [565]. The contracting officer assigns one NAICS code by principal purpose, and that code fixes the size standard [425] [285]. The `active` flag reads Yes for an active opportunity and No for an archived one, and `responseDeadLine` gives the date responses are due [567].

The deadlines follow rules. Outside commercial buys, a notice appears at least 15 days before the solicitation; above the simplified acquisition threshold offerors get at least 30 days to respond, and at least 45 days for research and development [563]. SAM.gov names three ways to take the data in bulk: DataBank reports, downloadable contract opportunity data files, and a public API [569]. The data.gov record for the downloadable file, the daily extract this guide's search draws on, does not state how often the file is updated [571].

Not every opportunity is here. Defense SBIR and STTR proposals go only through the DSIP portal, and SBIR.gov aggregates agency solicitation information [52] [11]. Grant notices of funding opportunity are posted on Grants.gov and generally stay open at least 60 calendar days [1328]. DoD's guide says SAM.gov may not be the most appropriate place to advertise other transactions, and for most consortia members pay dues and gain exclusive access to the Government's opportunities [1049] [1119].

## The key idea in one picture

Draw one notice as an annotated card. A header strip holds the title and the contracting office. Six callouts point at the fields: the type code, with a miniature timeline that places r, p, o or k, and a along the buying sequence; the set-aside code; the NAICS code, with an arrow to *size standard*; the active flag; the response deadline, drawn as a countdown; and the contact point and place of performance [567] [565].

Beside the card sit three smaller, greyed cards for what SAM.gov contract opportunities do not carry: *SBIR topic: DSIP or the agency's own site*, *grant: Grants.gov*, and *other transaction: consortium request* [52] [1328] [1119].

## The maths, gently

$$ t_{\text{offers due}} - t_{\text{notice}} \;\ge\; 15 + 30 = 45 \text{ days} $$

- Each *t* is a date. For a non-commercial action above the simplified acquisition threshold, the two minimums add up when the response time runs from the solicitation, as the overhaul's Part 5 table states it: 15 days from notice to solicitation, then 30 days to respond [563] [573].
- For research and development above that threshold the response time is at least 45 days, so the sum is 15 + 45 = 60 days [563].

## How this guide uses it

The mechanics record for reading SAM.gov contract opportunities lists every type code and set-aside code, and the opportunity search filters on the fields described here. The program records for SBIR, grants and consortia point to the portals where those opportunities appear.
<!-- framing -->

The citations here are to the codified FAR. The overhaul's model text for Part 5 requires a presolicitation notice above $20,000 and keeps the 15-day and 30-day figures; a proposed rule of June 23, 2026 would codify it and is not final [573] [574].
