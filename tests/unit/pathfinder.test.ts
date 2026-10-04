import { describe, expect, it } from 'vitest';
import { groupByFamily, rankRoutes, scoreRoute, type Pathfinder } from '../../src/lib/pathfinder';

/** A fixture with the pack's own question shapes (situation tags, offer/defense/certs modifiers). */
const pf: Pathfinder = {
  rule: 'deterministic: score = matched situation tags (2 each) + matched modifiers (1 each); routes with score 0 are hidden',
  note: '', always_show: ['sam-registration'],
  families: { 'sbir-sttr': 'SBIR', 'setaside-vehicle': 'Set-asides', partnering: 'Partnering', 'ot-cso': 'OT' },
  questions: [
    { id: 'situation', prompt: 'Where is the firm now?', type: 'single', options: [{ tag: 'have-technology', label: 'Has a technology that needs funding' }, { tag: 'looking-for-partners', label: 'Looking for partners, primes or teams' }, { tag: 'registered-no-award', label: 'Registered in SAM, no federal award yet' }] },
    { id: 'offer', prompt: 'What does the firm sell?', type: 'single', modifier: 'offer', options: [{ value: 'product', label: 'A product' }, { value: 'rd', label: 'Research and development' }] },
    { id: 'customer', prompt: 'Which side of government?', type: 'single', modifier: 'defense', options: [{ value: true, label: 'Defense' }, { value: false, label: 'Civilian' }, { value: null, label: 'Either' }] },
    { id: 'certifications', prompt: 'Which certifications?', type: 'multi', modifier: 'certs', options: [{ value: '8a', label: '8(a)' }, { value: 'hubzone', label: 'HUBZone' }, { value: 'none', label: 'None' }] },
  ],
  routes: [
    { id: 'sbir-grant', family: 'sbir-sttr', situations: ['have-technology'], modifiers: { rd: true, defense: false }, certs: [] },
    { id: 'sbir-contract', family: 'sbir-sttr', situations: ['have-technology'], modifiers: { rd: true, defense: true }, certs: [] },
    { id: 'eight-a', family: 'setaside-vehicle', situations: ['registered-no-award'], modifiers: {}, certs: ['8a'] },
    { id: 'teaming', family: 'partnering', situations: ['looking-for-partners', 'registered-no-award'], modifiers: {}, certs: [] },
    { id: 'crada', family: 'partnering', situations: ['have-technology'], modifiers: {}, certs: [] },
  ],
};

describe('pathfinder ranker (pathfinder.rule, exactly)', () => {
  it('given answers → the expected ordered ids and reasons', () => {
    const r = rankRoutes(pf, { situation: 'have-technology', offer: 'rd', customer: true });
    expect(r.map((x) => [x.id, x.score])).toEqual([['sbir-contract', 4], ['sbir-grant', 3], ['crada', 2]]);
    expect(r[0].reasons).toEqual([
      { question: 'Where is the firm now?', label: 'Has a technology that needs funding', points: 2 },
      { question: 'What does the firm sell?', label: 'Research and development', points: 1 },
      { question: 'Which side of government?', label: 'Defense', points: 1 },
    ]);
  });
  it('a route with score 0 is hidden', () => {
    const ids = rankRoutes(pf, { situation: 'have-technology' }).map((x) => x.id);
    expect(ids).not.toContain('eight-a');
    expect(ids).not.toContain('teaming');
  });
  it('certifications count one point each; "None" and "Either" match nothing', () => {
    expect(scoreRoute(pf.routes[2], pf, { certifications: ['8a', 'hubzone'] }).score).toBe(1);
    expect(scoreRoute(pf.routes[2], pf, { certifications: ['none'] }).score).toBe(0);
    expect(scoreRoute(pf.routes[0], pf, { customer: null }).score).toBe(0);
  });
  it('ties keep the pack’s order; groups follow the family order', () => {
    const r = rankRoutes(pf, { situation: 'registered-no-award' });
    expect(r.map((x) => x.id)).toEqual(['eight-a', 'teaming']);
    expect(groupByFamily(r, pf.families).map((g) => g.family)).toEqual(['setaside-vehicle', 'partnering']);
  });
  it('no answers → nothing ranked (always_show is the page’s job)', () => {
    expect(rankRoutes(pf, {})).toEqual([]);
  });
});
