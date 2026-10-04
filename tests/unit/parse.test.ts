import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { describe, expect, it } from 'vitest';
import { hasMath, parseReview, splitAtInlineMarkers, splitBlocks } from '../../scripts/lib/parse';
import { buildMatcher, unlink } from '../../scripts/lib/linker';
import { MINI, ROOT } from './helpers';

const PACK = path.join(ROOT, 'content-pack');
const glossaryOf = (dir: string) => yaml.load(fs.readFileSync(path.join(dir, 'glossary.yaml'), 'utf8')) as { id: string; term: string; variants: string[] }[];

describe('section, block and citation parser (fixture)', () => {
  const md = fs.readFileSync(path.join(MINI, 'review.md'), 'utf8');
  const parsed = parseReview(md, buildMatcher(glossaryOf(MINI)));

  it('splits sections with ids, titles and depths', () => {
    expect(parsed.sections.map((s) => s.id)).toEqual(['abstract', '1-intro']);
    expect(parsed.sections[1]).toMatchObject({ title: '1. Introduction', depth: 2, number: '1' });
  });
  it('resolves figure markers into slots and [n] into citation tokens', () => {
    expect(parsed.figureMarkers).toEqual(['mini-table', 'mini-path']);
    expect(parsed.sections[1].chunks[0]).toEqual({ kind: 'figure', id: 'mini-table' });
    expect(parsed.citations).toEqual([1, 2, 3]);
    const md0 = parsed.sections[0].chunks.find((c) => c.kind === 'md');
    expect(md0 && md0.kind === 'md' && md0.md).toContain('[1](#cite:1) [2](#cite:2)');
  });
  it('an inline synthesis marker labels its own sentence, and a trailing framing marker the next (validator semantics)', () => {
    const chunks = parsed.sections[1].chunks.filter((c) => c.kind === 'md');
    const markers = chunks.map((c) => (c.kind === 'md' ? c.marker : null));
    expect(markers).toEqual([null, 'synthesis', 'framing']);
    const syn = chunks[1];
    expect(syn.kind === 'md' && syn.id).toBe('syn-1-intro-1');
    expect(syn.kind === 'md' && syn.md).not.toContain('<!--');
  });
  it('counts blocks the way tools/validate_pack.py does: the mixed block is both framing and synthesis', () => {
    expect(parsed.blocks).toEqual({ total: 3, cited: 2, framing: 1, synthesis: 1 });
    expect(parsed.uncited).toEqual([]);
  });
  it('links the first occurrence of each term per section, longest match first', () => {
    expect(parsed.sections[0].terms).toEqual(['sam-gov', 'phase-ii-requirements']);
    expect(parsed.sections[1].terms).toEqual(['phase-ii', 'sam']);
  });
  it('a long block with no citation and no framing marker is reported as uncited', () => {
    const p = parseReview(md.replace('<!-- framing -->', ''), buildMatcher(glossaryOf(MINI)));
    // a synthesis marker alone does not exempt a block: only framing or a citation does
    expect(p.uncited.map((u) => u.section)).toEqual(['1-intro']);
  });
  it('splitAtInlineMarkers keeps the words and moves only paragraph breaks', () => {
    const segs = splitAtInlineMarkers(['A claim. <!-- synthesis -->', 'A transition.', '<!-- framing -->', 'Tail.'], null);
    expect(segs).toEqual([{ text: 'A claim.', marker: 'synthesis' }, { text: 'A transition.', marker: 'framing' }, { text: 'Tail.', marker: null }]);
  });
  it('splits blocks at blank lines; maths is $$…$$ only, so dollar amounts stay prose', () => {
    expect(splitBlocks('a\nb\n\nc')).toEqual(['a\nb', 'c']);
    expect(hasMath('between $15,000 and $350,000')).toBe(false);
    expect(hasMath('$$ V > 0 $$')).toBe(true);
  });
});

describe('the real pack', () => {
  const md = fs.readFileSync(path.join(PACK, 'review.md'), 'utf8');
  const parsed = parseReview(md, buildMatcher(glossaryOf(PACK)));
  it('parses the abstract and nine chapters with no duplicate ids', () => {
    expect(parsed.sections).toHaveLength(10);
    expect(parsed.duplicateSections).toEqual([]);
  });
  it('holds the citation gate: no uncited block', () => {
    expect(parsed.uncited).toEqual([]);
    expect(parsed.blocks.synthesis).toBeGreaterThan(0);
  });
  it('gives every synthesis passage a unique id', () => {
    const ids = parsed.synthesis.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('renders the builder’s prose as written — stripping the links returns the original words', () => {
    const words = (s: string) => s.replace(/<!--[\s\S]*?-->/g, ' ').replace(/\s+/g, ' ').trim();
    for (const s of parsed.sections) for (const c of s.chunks) if (c.kind === 'md') expect(words(md)).toContain(words(unlink(c.md)).slice(0, 60));
  });
});
