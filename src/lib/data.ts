import manifestJson from '@/data/manifest.json';
import provenanceJson from '@/data/provenance.json';
import termsJson from '@/data/glossary-short.json';
import conceptsIndexJson from '@/data/concepts-index.json';
import figuresIndexJson from '@/data/figures-index.json';
import sectionsIndexJson from '@/data/sections-index.json';
import type { ConceptMeta, Family, FigureMeta, SectionMeta, TermShort, Tier } from '@/types';

/*
 * Only slim indexes are imported here (they ride in the first chunk). Full files — sections, glossary, concepts,
 * figures, references (sharded), records — are imported by the routes that need them (src/lib/heavy.ts).
 */
export const manifest = manifestJson;
export const SLUG: string = manifest.slug;
export const APP_NAME = 'FAR Out';
export const provenance = provenanceJson;
export const terms = termsJson as unknown as TermShort[];
export const conceptsIndex = conceptsIndexJson as unknown as ConceptMeta[];
export const figuresIndex = figuresIndexJson as unknown as FigureMeta[];
export const sectionsIndex = sectionsIndexJson as unknown as SectionMeta[];

const termById = new Map(terms.map((t) => [t.id, t]));
const conceptById = new Map(conceptsIndex.map((c) => [c.id, c]));
const figureById = new Map(figuresIndex.map((f) => [f.id, f]));
const sectionById = new Map(sectionsIndex.map((s) => [s.id, s]));

export const getTerm = (id?: string | null) => (id ? termById.get(id) : undefined);
export const getConcept = (id?: string | null) => (id ? conceptById.get(id) : undefined);
export const getFigure = (id?: string | null) => (id ? figureById.get(id) : undefined);
export const getSection = (id?: string | null) => (id ? sectionById.get(id) : undefined);

export const bodySections = sectionsIndex;

export function assetUrl(rel: string): string {
  const base = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : import.meta.env.BASE_URL + '/';
  return base + rel.replace(/^\//, '');
}

export const sectionTitle = (id: string) => getSection(id)?.title ?? getFigure(id)?.label ?? id;
export const shortSectionTitle = (s: { title: string }) => s.title.replace(/^\d+(\.\d+)*\.?\s+/, '');

/** The sweep date, shown on /, /read and /about (APP-SPEC §6.1 rule 9). */
export const AS_OF: string = manifest.as_of ?? '';
export const longDate = (iso: string): string => {
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? String(iso) : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
};
export const asOfLong = () => longDate(AS_OF);

/** The four families: labels from manifest.extensions.families, colours from manifest.palette.groups (cat.*). */
export const FAMILIES = Object.keys(manifest.extensions.families) as Family[];
export const FAMILY_LABEL = manifest.extensions.families as Record<Family, string>;
export const PALETTE = manifest.palette.groups as Record<string, string>;
export const familyColour = (f?: string | null) => (f ? PALETTE[f] : undefined) ?? '#6b6b6b';

export const TIERS: Tier[] = ['seminal', 'classic', 'current', 'background'];
export const TIER_NOTE: Record<Tier, string> = {
  seminal: 'Seminal — the governing texts: statute, public law, regulation and SBA policy directive the guide rests on',
  classic: 'Classic — standing guidance older than the window (pre-2024) the field still leans on',
  current: 'Current — agency pages, solicitations, notices and memos dated 2024–2026',
  background: 'Background — other statutes, regulations, reports, tutorials, glossaries and press releases',
};

/** Status words for pending changes and the /changes ledger, in the pack's own vocabulary. */
export const STATUS_WORD: Record<string, string> = {
  final: 'final', proposed: 'proposed', announced: 'announced', 'class-deviation': 'class deviation', 'pending-implementation': 'pending implementation',
};

/**
 * Scroll an in-page anchor into view instantly, and once more after late content has settled.
 */
export function scrollToId(id: string) {
  const go = () => document.getElementById(id)?.scrollIntoView({ behavior: 'instant', block: 'start' });
  requestAnimationFrame(go);
  setTimeout(go, 250);
  setTimeout(go, 800);
}
