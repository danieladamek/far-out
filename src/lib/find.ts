/** /find: the harvested rows in one shape, and the filters. Pure, so it is unit-tested. */
export interface Opp {
  key: string; feed: 'sam' | 'grants'; id: string; number: string; title: string; agency: string; office: string;
  type: string; setAsideCode: string; setAside: string; naics: string; posted: string; deadline: string;
  link: string; desc: string; sbir: boolean; hay: string;
}
export interface FindState {
  q: string; feed: '' | 'sam' | 'grants'; any: string[]; types: string[]; setAside: string; naics: string[];
  agency: string; deadlineDays: string; postedDays: string; sbir: boolean;
}
interface Shard { columns: string[]; rows: unknown[][] }

const col = (s: Shard) => { const ix = Object.fromEntries(s.columns.map((c, i) => [c, i])); return (r: unknown[], c: string) => (ix[c] === undefined ? undefined : r[ix[c]]); };
const str = (v: unknown) => (v === null || v === undefined ? '' : String(v));

export function normaliseSam(s: Shard): Opp[] {
  const g = col(s);
  return s.rows.map((r) => {
    const o: Opp = {
      key: `sam:${str(g(r, 'id'))}`, feed: 'sam', id: str(g(r, 'id')), number: str(g(r, 'sol')), title: str(g(r, 'title')),
      agency: [str(g(r, 'agency')), str(g(r, 'subtier'))].filter((x, i, a) => x && a.indexOf(x) === i).join(' · '), office: str(g(r, 'office')),
      type: str(g(r, 'type')), setAsideCode: str(g(r, 'setAsideCode')), setAside: str(g(r, 'setAside')), naics: str(g(r, 'naics')),
      posted: str(g(r, 'posted')), deadline: str(g(r, 'deadline')), link: str(g(r, 'link')), desc: str(g(r, 'descExcerpt')), sbir: g(r, 'sbir') === true, hay: '',
    };
    o.hay = `${o.title} ${o.agency} ${o.office} ${o.desc} ${o.number}`.toLowerCase();
    return o;
  });
}

export function normaliseGrants(s: Shard): Opp[] {
  const g = col(s);
  return s.rows.map((r) => {
    const id = str(g(r, 'id'));
    const o: Opp = {
      key: `grants:${id}`, feed: 'grants', id, number: str(g(r, 'number')), title: str(g(r, 'title')), agency: str(g(r, 'agency')), office: '',
      type: str(g(r, 'oppStatus')) ? `Grant (${str(g(r, 'oppStatus'))})` : 'Grant', setAsideCode: '', setAside: '', naics: '',
      posted: str(g(r, 'openDate')), deadline: str(g(r, 'closeDate')),
      link: `https://www.grants.gov/search-results-detail/${id}`, desc: '', sbir: g(r, 'sbir') === true, hay: '',
    };
    o.hay = `${o.title} ${o.agency} ${o.number}`.toLowerCase();
    return o;
  });
}

const addDays = (iso: string, d: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + d * 86400000).toISOString().slice(0, 10);

/** Every filter except the free-text keyword (that one runs through the index). Saved-search keywords are any-of phrases. */
export function matchesFilters(o: Opp, f: FindState, today: string): boolean {
  if (f.feed && o.feed !== f.feed) return false;
  if (f.sbir && !o.sbir) return false;
  if (f.any.length && !f.any.some((k) => o.hay.includes(k.toLowerCase()))) return false;
  if (f.types.length && !f.types.includes(o.type)) return false;
  if (f.setAside && o.setAsideCode !== f.setAside) return false;
  if (f.naics.length && !f.naics.some((p) => o.naics.startsWith(p))) return false;
  if (f.agency && !o.agency.toLowerCase().includes(f.agency.toLowerCase())) return false;
  if (f.deadlineDays) { if (!o.deadline || o.deadline < today || o.deadline > addDays(today, Number(f.deadlineDays))) return false; }
  if (f.postedDays) { if (!o.posted || o.posted < addDays(today, -Number(f.postedDays))) return false; }
  if (f.q) { const words = f.q.toLowerCase().split(/\s+/).filter(Boolean); if (!words.every((w) => o.hay.includes(w))) return false; }
  return true;
}
