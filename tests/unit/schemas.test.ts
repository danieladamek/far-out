import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ManifestSchema, zodErrors, type FigureDef } from '../../scripts/lib/schemas';
import { loadFigureData } from '../../scripts/lib/figures';
import { classifyGate } from '../../scripts/lib/records';
import { editYaml, loadYaml, MINI, ROOT, runBuild } from './helpers';

type Rec = Record<string, unknown>;
const messages = (r: { success: boolean; error?: unknown }) => (r.success ? [] : zodErrors('x', r.error as never).map((e) => `${e.where}: ${e.message}`));
const has = (errs: { where: string; message: string }[], where: string, msg: RegExp) => errs.some((e) => e.where.includes(where) && msg.test(e.message));

describe('the packs validate', () => {
  it('the fixture pack builds with 0 errors', () => {
    const r = runBuild();
    expect(r.errors).toEqual([]);
    expect(r.code).toBe(0);
  });
  it('the real pack: no uncited prose anywhere; the only errors are unknown ids the pack really has', () => {
    const prov = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/provenance.json'), 'utf8'));
    const errs = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/build-errors.json'), 'utf8')) as { where: string; message: string }[];
    expect(prov.blocks.uncited).toBe(0);
    expect(prov.concept_uncited).toBe(0);
    expect(prov.record_prose.uncited).toBe(0);
    expect(prov.terms.linked_pct_of_occurring).toBeGreaterThanOrEqual(95);
    expect(errs.every((e) => /unknown (gate|program) id/.test(e.message))).toBe(true);
    expect(prov.build_errors).toBe(errs.length);
  });
});

describe('one deliberate error per rule fails the build with the right message', () => {
  it('manifest: permissions.text is required', () => {
    const r = runBuild((d) => editYaml<{ permissions: { text: string } }>(d, 'manifest.yaml', (m) => { m.permissions.text = ''; }));
    expect(r.code).toBe(1);
    expect(has(r.errors, 'manifest/permissions/text', /REQUIRED/)).toBe(true);
    expect(r.buildErrorsMd).toContain('permissions.text is REQUIRED');
  });
  it('manifest: topic mode needs a venue that says it is not peer reviewed; every family needs a colour', () => {
    const m = loadYaml<Rec & { palette: { groups: Record<string, string> } }>(MINI, 'manifest.yaml');
    expect(messages(ManifestSchema.safeParse({ ...m, venue: 'Official guidance' }))).toContain('x/venue: topic mode: venue must make the non-peer-reviewed status unmissable');
    const noColour = structuredClone(m); delete noColour.palette.groups['ot-cso'];
    expect(messages(ManifestSchema.safeParse(noColour))).toContain('x/palette/groups: palette.groups needs a colour for family ot-cso');
  });
  it('an extension record with an unknown gate id', () => {
    const r = runBuild((d) => editYaml<Rec[]>(d, 'routes.yaml', (rs) => { (rs[0].gates as string[]).push('no-such-gate'); }));
    expect(r.code).toBe(1);
    expect(has(r.errors, 'routes/route-one', /gates\[\] -> unknown gate id no-such-gate/)).toBe(true);
  });
  it('an unknown program id and an unknown affects id', () => {
    const r = runBuild((d) => {
      editYaml<Rec[]>(d, 'routes.yaml', (rs) => { rs[0].programs = ['ghost-program']; });
      editYaml<Rec[]>(d, 'changes.yaml', (rs) => { (rs[0].affects as string[]).push('ghost-record'); });
    });
    expect(has(r.errors, 'routes/route-one', /programs\[\] -> unknown program id ghost-program/)).toBe(true);
    expect(has(r.errors, 'changes/chg-one', /affects\[\] -> unknown record id ghost-record/)).toBe(true);
  });
  it('a situations tag outside the five', () => {
    const r = runBuild((d) => editYaml<Rec[]>(d, 'routes.yaml', (rs) => { rs[1].situations = ['wants-money']; }));
    expect(r.code).toBe(1);
    expect(has(r.errors, 'routes/route-two/situations/0', /Invalid enum value.*'not-yet-registered'/)).toBe(true);
  });
  it('a find_filter.feed outside the four', () => {
    const r = runBuild((d) => editYaml<Rec[]>(d, 'routes.yaml', (rs) => { (rs[0].find_filter as Rec).feed = 'twitter'; }));
    expect(has(r.errors, 'routes/route-one/find_filter/feed', /Invalid enum value. Expected 'sam' \| 'grants' \| 'both' \| 'none'/)).toBe(true);
  });
  it('a route prose field with an uncited block of 25 words or more', () => {
    const long = 'This route lets a small firm do a great many things over a long period of time without any source being cited for the claim made here at all.';
    const r = runBuild((d) => editYaml<Rec[]>(d, 'routes.yaml', (rs) => { (rs[0].how_it_works as string[]).push(long); }));
    expect(r.code).toBe(1);
    expect(has(r.errors, 'routes/route-one/how_it_works/1', /uncited record prose of \d+ words/)).toBe(true);
  });
  it('an unresolved [n] in any record field and in sources[]', () => {
    const r = runBuild((d) => editYaml<Rec[]>(d, 'gates.yaml', (rs) => { rs[0].what = 'Register [999].'; (rs[0].sources as number[]).push(998); }));
    expect(has(r.errors, 'gates/sam-registration/what', /cites \[999\] with no reference entry/)).toBe(true);
    expect(has(r.errors, 'gates/sam-registration', /sources -> \[998\]/)).toBe(true);
  });
  it('review.md: an uncited block, never repaired by inventing a citation', () => {
    const r = runBuild((d) => { const p = path.join(d, 'review.md'); fs.writeFileSync(p, fs.readFileSync(p, 'utf8').replace(' <!-- synthesis -->', '').replace('<!-- framing -->', '')); });
    expect(r.code).toBe(1);
    expect(has(r.errors, 'review.md/1-intro', /uncited block of \d+ words/)).toBe(true);
    expect(r.buildErrorsMd).toContain('never repaired by adding a citation');
  });
  it('glossary: an ambiguous variant, an unknown see id, an unknown concept', () => {
    const r = runBuild((d) => editYaml<Rec[]>(d, 'glossary.yaml', (g) => { (g[0].variants as string[]).push('SAM'); g[1].see = ['nope']; g[2].concept = 'no-concept'; }));
    expect(has(r.errors, 'glossary', /ambiguous variant "sam" claimed by phase-ii and sam/)).toBe(true);
    expect(has(r.errors, 'glossary/phase-ii-requirements', /see -> unknown nope/)).toBe(true);
    expect(has(r.errors, 'glossary/sam', /concept -> unknown no-concept/)).toBe(true);
  });
  it('figures: a missing data file and a declared field not in the CSV', () => {
    const r = runBuild((d) => editYaml<Rec[]>(d, 'figures.yaml', (fs2) => { fs2[1].data = 'figures/data/missing.json'; (fs2[0].columns as Rec[]).push({ field: 'nope' }); }));
    expect(has(r.errors, 'figures/mini-path', /data file missing/)).toBe(true);
    expect(has(r.errors, 'figures/mini-table', /column field nope not in csv/)).toBe(true);
  });
  it('a duplicate record id', () => {
    const r = runBuild((d) => editYaml<Rec[]>(d, 'help.yaml', (rs) => { rs.push(structuredClone(rs[0])); }));
    expect(has(r.errors, 'help/help-one', /duplicate id/)).toBe(true);
  });
});

describe('figure data field validation', () => {
  const figs = loadYaml<FigureDef[]>(MINI, 'figures.yaml');
  const ctx = { termIds: new Set<string>(), sectionIds: new Set(['1-intro']), refNs: new Set([1, 2, 3, 4, 5, 6]), topic: true, recordKeys: new Set(['routes/route-one', 'gates/sam-registration']) };
  it('reads a data CSV whose ref cells hold ";"-separated lists', () => {
    const errors: { where: string; message: string }[] = [];
    const out = loadFigureData(figs[0], MINI, ctx, errors);
    expect(errors).toEqual([]);
    expect(out.table?.rows).toHaveLength(2);
  });
  it('a data figure row whose ref is not a reference fails', () => {
    const errors: { where: string; message: string }[] = [];
    loadFigureData(figs[0], MINI, { ...ctx, refNs: new Set([1]) }, errors);
    expect(errors.map((e) => e.message)).toContain('row 1: ref 2 has no reference entry');
  });
  it('pathway JSON: from/to edges resolve, node record links resolve', () => {
    const errors: { where: string; message: string }[] = [];
    const out = loadFigureData(figs[1], MINI, ctx, errors);
    expect(errors).toEqual([]);
    expect(out.pathway?.edges[0]).toMatchObject({ from: 'start', to: 'r1' });
    const bad: typeof errors = [];
    loadFigureData(figs[1], MINI, { ...ctx, recordKeys: new Set() }, bad);
    expect(bad.map((e) => e.message)).toContain('node r1 links to unknown record routes/route-one');
  });
});

describe('gate grouping is derived from the gate’s own fields', () => {
  it('classifies by the first sentence of applies_when, in rule order', () => {
    expect(classifyGate({ id: 'ot-ip-rights', name: 'IP in OTs', applies_when: 'Before signing any OT.' }).group).toBe('ot');
    expect(classifyGate({ id: 'x', name: 'Prompt payment', applies_when: 'Subcontractors under a prime.' }).group).toBe('paid');
    expect(classifyGate({ id: 'dcaa', name: 'Accounting', applies_when: 'Cost-reimbursement contracts and orders.' }).group).toBe('contract-type');
    expect(classifyGate({ id: 'e', name: 'E-Verify', applies_when: 'Contracts that exceed $150,000.' })).toEqual({ group: 'threshold', because: '$150,000' });
    expect(classifyGate({ id: 'fcl', name: 'Clearance', applies_when: 'Access to classified information.' }).group).toBe('touches');
    expect(classifyGate({ id: 'sam', name: 'SAM', applies_when: 'Before applying to NIH.' }).group).toBe('every');
  });
});
