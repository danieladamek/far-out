export type BlockMarker = 'framing' | 'synthesis' | null;

export type Chunk =
  | { kind: 'md'; md: string; hasMath: boolean; marker: BlockMarker; id: string | null }
  | { kind: 'figure'; id: string };

export interface Section {
  id: string; title: string; depth: number; number: string | null;
  chunks: Chunk[]; terms: string[]; cites: number[]; figures: string[]; words: number;
  blocks: number; cited_blocks: number; framing_blocks: number; synthesis_blocks: number;
}

export type Domain = 'law' | 'program' | 'process' | 'status' | 'organisation' | 'notation';

export interface GlossaryEntry {
  id: string; term: string; kind: string; domain: Domain;
  variants: string[]; short: string; definition: string; concept?: string; see: string[]; sources: string[];
  appears_in: string[]; in_records: string[]; in_concepts: string[]; occurrences: number; figures: string[];
}

export interface SelfCheck { q: string; options: string[]; answer: number; explanation: string }
export interface Concept {
  id: string; title: string; one_liner: string; why_here: string; prerequisites: string[]; terms: string[]; figures: string[];
  further_reading: { title: string; url: string; kind?: string }[]; self_check: SelfCheck[];
  body_before: string; picture: string | null; body_after: string; has_math: boolean;
  used_by_terms: string[]; used_by_figures: string[]; used_by_concepts: string[];
}

export type Row = Record<string, string | number | null>;
export interface PathwayNode {
  id: string; kind: string; label: string; col: number; row: number; refs: number[];
  record?: string; route?: string; program?: string; gate?: string; family?: string; situation?: string; situations: string[];
  governing_text?: string; detail?: string;
}
export interface PathwayEdge { from: string; to: string; kind?: string; label?: string; refs: number[]; routes: string[] }
export interface Pathway { note: string; nodes: PathwayNode[]; edges: PathwayEdge[] }
export interface Explain { on: string; text: string; term?: string; concept?: string }
export interface Axis { field?: string; label?: string; unit?: string; scale?: 'linear' | 'log' }
export interface ChartSpec { type: string; x?: Axis; y?: Axis; series?: { field: string; label?: string }; ci?: [string, string] }
export interface Figure {
  id: string; label: string; title: string; kind: 'chart' | 'table' | 'network' | 'pathway' | 'image';
  synthesis?: 'data' | 'conceptual'; refs: number[]; data?: string; script?: string;
  columns?: { field: string; label?: string }[];
  chart?: ChartSpec; caption: string; how_to_read: string;
  explain: Explain[]; concepts: string[]; discussed_in: string[]; source: string;
  table?: { rows: Row[]; fields: string[] }; pathway?: Pathway;
  provenance: string;
}

export type Tier = 'seminal' | 'classic' | 'current' | 'background';

export interface Reference {
  n: number; key: string; tier: Tier; citation: string; url: string; final_url?: string; year: number;
  published: string; page_date?: string; date_note?: string; accessed: string; publisher: string;
  source_kind: 'primary' | 'secondary'; read: 'full' | 'partial' | 'not-fetched';
  summary: string; why_it_mattered: string; key_facts: string[]; quotes: string[];
  dropped_quotes: { quote: string; verdict?: string }[];
  role_here: string; role_note: string; cited_in: string[]; verified: boolean;
  recheck: boolean; rechecked?: string; recheck_note?: string; prev_n?: number | number[]; tier_note?: string;
  cited_sections: string[]; cited_records: string[]; cited_elsewhere: string[];
}
export interface ReferenceMeta {
  n: number; key: string; year: number; tier: Tier; publisher: string; source_kind: 'primary' | 'secondary'; read: string;
  verified: boolean; rechecked: boolean; citation: string; cited_sections: string[]; cited: boolean;
}

export interface TodoItem { id: string; kind: 'gap' | 'conflict' | 'unverified' | 'recheck'; where: string; what: string }
export interface BuildError { where: string; message: string }
export interface SynthesisPassage { id: string; section: string; excerpt: string; words: number }

/* ── extension records (KICKOFF §4b). Prose strings arrive term- and citation-linked from the content build. */

export type Family = 'sbir-sttr' | 'setaside-vehicle' | 'partnering' | 'ot-cso';
export type RecordType = 'routes' | 'programs' | 'certifications' | 'gates' | 'buyers' | 'help' | 'primes' | 'mechanics' | 'changes';
export interface PendingChange { status: string; date: string; text: string; [k: string]: unknown }
export interface FindFilter { feed: 'sam' | 'grants' | 'both' | 'none'; keywords: string[]; types: string[]; naics: string[]; set_aside: string[] }

export interface RecordBase {
  id: string; name?: string; official_url?: string; pending_changes: PendingChange[]; as_of: string; sources: number[]; conflicts: string[];
  changes: string[]; [k: string]: unknown;
}
export interface Route extends RecordBase {
  name: string; family: Family; governing_text: string; what: string; who_for: string;
  how_it_works: string[]; benefits: string[]; requirements: string[]; steps: string[];
  gates: string[]; programs: string[]; situations: string[]; modifiers: Record<string, boolean | null>; find_filter?: FindFilter;
}
export interface Program extends RecordBase {
  name: string; family?: Family | null; kind: string; status?: string | null; status_note?: string; what?: string;
  eligibility: string[]; steps: string[]; gates: string[]; situations: string[]; distinctive?: string; routes: string[]; find_filter?: FindFilter;
}
export interface Gate extends RecordBase {
  name: string; what: string; applies_when: string; steps: string[]; how_it_works: string[];
  routes: string[]; programs_requiring: string[]; group: { group: string; because: string };
}
export interface Change { id: string; date: string; status: string; basis: string; what: string; affects: string[]; sources: number[]; affects_files: Record<string, RecordType[]>; [k: string]: unknown }

export interface Pathfinder {
  rule: string; note: string; families: Record<string, string>; always_show: string[];
  questions: { id: string; prompt: string; type: 'single' | 'multi'; modifier?: string; options: { tag?: string; value?: string | boolean | null; label: string }[] }[];
  routes: { id: string; family: Family; situations: string[]; modifiers: Record<string, boolean | null>; certs: string[] }[];
}

export interface RecordMeta { type: RecordType; id: string; title: string; to: string; family: Family | null; kind: string | null }

/* ── slim indexes */

export interface TermShort { id: string; term: string; kind: string; domain: Domain; short: string; concept: string | null }
export interface ConceptMeta { id: string; title: string; one_liner: string; prerequisites: string[]; figures: string[]; terms: string[] }
export interface SectionMeta { id: string; title: string; depth: number; number: string | null; words: number; figures: string[]; synthesis_blocks: number; terms: string[] }
export interface FigureMeta {
  id: string; label: string; title: string; kind: Figure['kind']; synthesis: 'data' | 'conceptual' | null;
  provenance: string; concepts: string[]; refs: number[]; rows: number | null; has_chart: boolean; discussed_in: string[];
}
