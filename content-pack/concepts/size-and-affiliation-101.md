---
id: size-and-affiliation-101
title: Size and affiliation 101
one_liner: 'Small is a measured status: a ceiling per industry code, with the firms a business is tied to counted
  in.'
why_here: Set-asides, certifications, joint ventures and SBIR all turn on whether a firm is small on the date that
  counts.
prerequisites: []
terms:
- size-standard
- naics
- affiliation
- recertification
- size-protest
- contracting-officer
- mentor-protege-sba
- joint-venture
- ostensible-subcontractor
figures: []
further_reading:
- title: SBA, Size standards (contracting guide)
  url: https://www.sba.gov/federal-contracting/contracting-guide/size-standards
  kind: guide
- title: SBA Size Standards Tool
  url: https://legacy.sba.gov/federal-contracting/contracting-guide/size-standards/size-standards-tool
  kind: guide
- title: 13 CFR 121.103, How does SBA determine affiliation?
  url: https://www.ecfr.gov/current/title-13/chapter-I/part-121/subpart-A/subject-group-ECFR0ed6f5ff9a6da32/section-121.103
  kind: regulation
- title: 13 CFR 121.106, How does SBA calculate number of employees?
  url: https://www.ecfr.gov/current/title-13/section-121.106
  kind: regulation
- title: 13 CFR 125.12, Recertification of size and status
  url: https://www.ecfr.gov/current/title-13/chapter-I/part-125/section-125.12
  kind: regulation
self_check:
- q: Over what period are annual receipts averaged for a receipts-based size standard?
  options:
  - The most recent fiscal year
  - The latest three completed fiscal years
  - The latest five completed fiscal years
  - The preceding 24 calendar months
  answer: 2
  explanation: 13 CFR 121.104 averages receipts over the latest five completed fiscal years; the 24-month figure
    belongs to the employee count in 13 CFR 121.106 [281] [282].
- q: On what does affiliation rest?
  options:
  - A shared office address
  - The power to control, whether exercised or not
  - A signed teaming agreement
  - Being assigned the same NAICS code
  answer: 1
  explanation: SBA's guide says "Affiliation with another business is based on the power to control, whether exercised
    or not." [278]
- q: After a merger that changes controlling interest, when does 13 CFR 125.12 require recertification of size?
  options:
  - Within 30 calendar days
  - At the next option period
  - Within one year
  - Never; size is fixed at award
  answer: 0
  explanation: 13 CFR 125.12 requires recertification of size and program status within 30 calendar days of a merger,
    acquisition or sale [291].
---

## What it is

In federal contracting, small is a measured status. A size standard is a ceiling for one NAICS industry code, set in employees or in average annual receipts, and the table of ceilings is 13 CFR 121.201 [284]. The contracting officer designates the code for each solicitation, and "A concern must not exceed the size standard for the NAICS code specified in the solicitation." [285]

The measurement is an average. Receipts are averaged over the latest five completed fiscal years. Employees are averaged over the preceding 24 calendar months, and "Part-time and temporary employees are counted the same as full-time employees." [281] [282] Size is fixed on the date of the firm's written self-certification with its initial offer that includes price, and a firm that is small at award generally stays small for the life of the contract [290].

Affiliation decides whose numbers count. SBA's guide puts it in one sentence: "Affiliation with another business is based on the power to control, whether exercised or not." [278] Affiliates' employees and receipts are added to the firm's own [278]. Control can come from ownership, common management or family ties, and economic dependence is presumed when 70% or more of a firm's receipts come from one concern over three fiscal years [297]. The exceptions in 13 CFR 121.103(b) include firms owned by Indian Tribes, Alaska Native Corporations, Native Hawaiian Organizations and Community Development Corporations, and SBA-approved mentor-protégé relationships [297].

Status can change and be challenged. 13 CFR 125.12 requires recertification within 30 calendar days of a merger, acquisition or sale that changes controlling interest, and on contracts longer than five years [291]. A competitor's size protest is due by the fifth business day after bid opening or notice of the apparent successful offeror, and the same deadline applies to HUBZone, SDVOSB and WOSB status protests [294] [458] [462] [463] [464]. Willful misrepresentation of size carries "a presumption of loss to the United States based on the total amount expended" [295] [296].

## The key idea in one picture

Draw a decision flow of four boxes, left to right. Box one asks which NAICS code is on the solicitation [285]. Box two asks whether that code's ceiling is in receipts or in employees [284]. Box three, *add affiliates*, holds a small sketch: the firm in the centre, solid lines to an owner, a sister company and a dominant customer, each labelled *control*, and two dashed lines labelled *exception* to an approved mentor and to a Tribal owner [297].

Box four compares the total with the ceiling on the date of the first priced offer [290]. Two markers hang off the flow. A loop arrow from *merger, acquisition or sale* returns to box three, labelled *recertify within 30 calendar days* [291]. A flag on box four reads *protest: fifth business day* [294].

## The maths, gently

$$ \frac{R_1 + R_2 + R_3 + R_4 + R_5}{5} + A \le S $$

- *R₁* to *R₅* are the firm's receipts in its latest five completed fiscal years, *A* is the same average for its affiliates, and *S* is the ceiling for the solicitation's NAICS code [281] [278] [285].
- Worked, with illustrative figures: receipts of $4, $5, $6, $7 and $8 million average $6 million. With one affiliate averaging $3 million, the figure compared with the ceiling is $9 million [281] [278].
- Economic dependence: when the share of receipts from one concern is 0.70 or more over three fiscal years, affiliation is presumed, and the presumption can be rebutted [297].

## How this guide uses it

Chapter 4 opens with this test. The certification records for size standards and for affiliation carry the full rules, and the gates for representing size and for recertification apply them. The size protest and status protest routes cover the challenges, and the joint venture and mentor-protégé records rest on the affiliation exceptions.
<!-- framing -->

SBIR and STTR use their own test: an awardee, together with its affiliates, must not have more than 500 employees [10]. Pending: a proposed rule of August 20, 2026 would collapse nearly 1,000 size standards into 338; comments closed September 21, 2026 and it has no effective date [288].
