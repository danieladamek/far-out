import { describe, expect, it } from 'vitest';
import { matchesFilters, normaliseGrants, normaliseSam, type FindState } from '../../src/lib/find';

const sam = normaliseSam({
  columns: ['id', 'title', 'sol', 'agency', 'subtier', 'office', 'posted', 'type', 'setAsideCode', 'setAside', 'deadline', 'naics', 'psc', 'popState', 'link', 'descExcerpt', 'sbir'],
  rows: [
    ['a1', 'SBIR Phase I topic', 'S1', 'DEPT OF DEFENSE', 'ARMY', 'Office', '2026-10-01', 'Solicitation', 'SBA', 'Total Small Business', '2026-10-20', '541715', 'AC', 'VA', 'https://sam.gov/opp/a1/view', 'Research', true],
    ['a2', 'Janitorial services', 'S2', 'GSA', 'GSA', 'Office', '2026-06-01', 'Sources Sought', 'NONE', 'No Set aside used', '', '561720', 'S201', 'DC', 'https://sam.gov/opp/a2/view', 'Cleaning', false],
  ],
});
const grants = normaliseGrants({ columns: ['id', 'number', 'title', 'agency', 'agencyCode', 'openDate', 'closeDate', 'oppStatus', 'docType', 'cfdaList', 'eligibilities', 'sbir'], rows: [['9', 'PA-27-100', 'Small Business Innovation Research grants', 'NIH', 'HHS-NIH11', '2026-09-01', '2027-04-05', 'posted', 'synopsis', [], ['23'], true]] });
const base: FindState = { q: '', feed: '', any: [], types: [], setAside: '', naics: [], agency: '', deadlineDays: '', postedDays: '', sbir: false };
const today = '2026-10-04';

describe('/find filters', () => {
  it('normalises both feeds and links out, never proxied', () => {
    expect(sam[0].link).toBe('https://sam.gov/opp/a1/view');
    expect(grants[0].link).toBe('https://www.grants.gov/search-results-detail/9');
  });
  it('a route saved filter (feed + any-of phrases) and the SBIR toggle', () => {
    const all = [...sam, ...grants];
    expect(all.filter((o) => matchesFilters(o, { ...base, feed: 'grants', any: ['Small Business Innovation Research'] }, today)).map((o) => o.id)).toEqual(['9']);
    expect(all.filter((o) => matchesFilters(o, { ...base, sbir: true }, today)).map((o) => o.id)).toEqual(['a1', '9']);
  });
  it('notice type, set-aside, NAICS prefix, agency, deadline and posted windows', () => {
    expect(sam.filter((o) => matchesFilters(o, { ...base, types: ['Sources Sought'] }, today)).map((o) => o.id)).toEqual(['a2']);
    expect(sam.filter((o) => matchesFilters(o, { ...base, setAside: 'SBA' }, today)).map((o) => o.id)).toEqual(['a1']);
    expect(sam.filter((o) => matchesFilters(o, { ...base, naics: ['5617'] }, today)).map((o) => o.id)).toEqual(['a2']);
    expect(sam.filter((o) => matchesFilters(o, { ...base, agency: 'army' }, today)).map((o) => o.id)).toEqual(['a1']);
    expect(sam.filter((o) => matchesFilters(o, { ...base, deadlineDays: '30' }, today)).map((o) => o.id)).toEqual(['a1']);
    expect(sam.filter((o) => matchesFilters(o, { ...base, postedDays: '7' }, today)).map((o) => o.id)).toEqual(['a1']);
  });
});
