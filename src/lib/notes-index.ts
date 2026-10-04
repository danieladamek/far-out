import { conceptsIndex, figuresIndex, sectionsIndex, terms } from '@/lib/data';
import type { AnchorIndex } from '@/lib/notepad';
import type * as Extras from '@/lib/extras';

/**
 * The ids notes can anchor to, from the current build. A term or 101 files under the first section that links it;
 * a figure under the first section that embeds or discusses it; a reference under the first section that cites it;
 * a record under its own type. The reference and record indexes are a separate chunk, so this is a Promise.
 */
export function buildAnchorIndex({ referencesIndex, recordsIndex }: Pick<typeof Extras, 'referencesIndex' | 'recordsIndex'>): AnchorIndex {
  const termSections = new Map<string, string[]>();
  for (const s of sectionsIndex) for (const t of s.terms) { if (!termSections.has(t)) termSections.set(t, []); termSections.get(t)!.push(s.id); }
  const order = (a: string, b: string) => sectionsIndex.findIndex((s) => s.id === a) - sectionsIndex.findIndex((s) => s.id === b);
  return {
    sections: sectionsIndex.map((s) => ({ id: s.id, title: s.title, number: s.number })),
    terms: new Map(terms.map((t) => [t.id, { term: t.term, sections: termSections.get(t.id) ?? [] }])),
    concepts: new Map(conceptsIndex.map((c) => [c.id, { title: c.title, sections: [...new Set(c.terms.flatMap((t) => termSections.get(t) ?? []))].sort(order) }])),
    figures: new Map(figuresIndex.map((f) => [f.id, { label: f.label, title: f.title, sections: [...sectionsIndex.filter((s) => s.figures.includes(f.id)).map((s) => s.id), ...f.discussed_in] }])),
    refs: new Map(referencesIndex.map((r) => [r.n, { citation: r.citation, key: r.key, sections: r.cited_sections }])),
    records: new Map(recordsIndex.map((r) => [`${r.type}/${r.id}`, { title: r.title, to: r.to }])),
  };
}

let cached: Promise<AnchorIndex> | null = null;
export function loadAnchorIndex(): Promise<AnchorIndex> {
  if (!cached) cached = import('@/lib/extras').then((x) => buildAnchorIndex(x));
  return cached;
}
