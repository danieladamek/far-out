import searchJson from '@/data/search.json';

export type SearchKind = 'term' | 'concept' | 'figure' | 'section' | 'routes' | 'programs' | 'certifications' | 'gates' | 'buyers' | 'help' | 'primes' | 'mechanics' | 'changes';
export interface SearchHit { kind: SearchKind; id: string; title: string; subtitle: string; to: string }

/** Built at content-build time (terms + variants, 101s, figures, sections and every record); lives in the lazy search chunk. */
const INDEX = searchJson as (SearchHit & { hay: string })[];

export function search(q: string, limit = 16): SearchHit[] {
  const query = q.trim().toLowerCase();
  if (!query) return [];
  const words = query.split(/\s+/);
  const scored = INDEX.map((e) => {
    let score = 0;
    const title = e.title.toLowerCase();
    if (title === query) score += 100;
    else if (title.startsWith(query)) score += 60;
    else if (title.includes(query)) score += 40;
    for (const w of words) if (e.hay.includes(w)) score += 10;
    if (words.length > 1 && !words.every((w) => e.hay.includes(w) || title.includes(w))) score = Math.min(score, 15);
    return { e, score };
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score || a.e.title.localeCompare(b.e.title));
  return scored.slice(0, limit).map(({ e }) => ({ kind: e.kind, id: e.id, title: e.title, subtitle: e.subtitle, to: e.to }));
}
