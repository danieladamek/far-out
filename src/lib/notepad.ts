/**
 * The notepad (APP-SPEC §3.1), ported from ptsd-inflammation-critique at afb9dab (via words-as-pointers). Each note
 * hangs on something this app renders — a guide section, a glossary term, a 101, a figure, a reference, or any
 * record (route, program, certification, gate, buyer, help entry, prime, how-it-works page, dated change) — or on
 * nothing. Pure state + serialisation, so it is unit-tested and survives content rebuilds: notes are keyed to
 * stable ids (section ids, term ids, [n], q1…) and an anchor that disappears from the pack is kept and reported as
 * orphaned — never dropped.
 *
 * Every note is typed by the reader. The export is organised by review section in reading order, each note
 * carrying its anchor and the quote it hangs on.
 *
 * Port changes (recorded in the scrum note): the anchor types are this app's objects (sections, terms, 101s,
 * figures, references and the nine record types) instead of claims and curriculum units; record notes export in
 * their own groups after the sections, in site order; the export header names this app.
 */

export const RECORD_ANCHORS = ['routes', 'programs', 'certifications', 'gates', 'buyers', 'help', 'primes', 'mechanics', 'changes'] as const;
export type RecordAnchor = (typeof RECORD_ANCHORS)[number];
export type AnchorType = 'section' | 'term' | 'concept' | 'figure' | 'ref' | RecordAnchor | 'free';
export const ANCHOR_TYPES: AnchorType[] = ['section', 'term', 'concept', 'figure', 'ref', ...RECORD_ANCHORS, 'free'];
export const RECORD_GROUP_TITLE: Record<RecordAnchor, string> = {
  routes: 'Routes', programs: 'Programs, vehicles and consortia', certifications: 'Certifications and size status', gates: 'Gates',
  buyers: 'Buyers', help: 'Help and outreach', primes: 'Primes', mechanics: 'How it works', changes: 'What changed',
};
const RECORD_WORD: Record<RecordAnchor, string> = {
  routes: 'route', programs: 'program', certifications: 'status', gates: 'gate', buyers: 'buyer', help: 'help', primes: 'prime', mechanics: 'how it works', changes: 'change',
};
export interface Anchor { type: AnchorType; id: string }
export interface Note { id: string; anchor: Anchor; quote?: string; body: string; created: string; updated: string }
export interface NotepadState { version: 2; notes: Note[] }

export const emptyNotepad = (): NotepadState => ({ version: 2, notes: [] });

export type NotepadAction =
  | { type: 'add'; note: Omit<Note, 'id' | 'created' | 'updated'> & { id?: string; created?: string } }
  | { type: 'update'; id: string; body?: string; anchor?: Anchor; quote?: string }
  | { type: 'remove'; id: string }
  | { type: 'replace'; state: NotepadState }
  | { type: 'merge'; notes: Note[] }
  | { type: 'clear' };

let counter = 0;
export function newId(now = Date.now()): string {
  counter = (counter + 1) % 1e6;
  return `n-${now.toString(36)}-${counter.toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function reducer(state: NotepadState, action: NotepadAction, now: () => string = () => new Date().toISOString()): NotepadState {
  switch (action.type) {
    case 'add': {
      const t = now();
      const note: Note = { id: action.note.id ?? newId(), anchor: action.note.anchor, quote: action.note.quote, body: action.note.body, created: action.note.created ?? t, updated: t };
      return { ...state, notes: [...state.notes, note] };
    }
    case 'update':
      return { ...state, notes: state.notes.map((n) => (n.id === action.id ? { ...n, body: action.body ?? n.body, anchor: action.anchor ?? n.anchor, quote: action.quote ?? n.quote, updated: now() } : n)) };
    case 'remove':
      return { ...state, notes: state.notes.filter((n) => n.id !== action.id) };
    case 'replace':
      return normalise(action.state);
    case 'merge': {
      const byId = new Map(state.notes.map((n) => [n.id, n]));
      for (const n of action.notes) {
        const prev = byId.get(n.id);
        if (!prev || prev.updated < n.updated) byId.set(n.id, n);
      }
      return { ...state, notes: [...byId.values()] };
    }
    case 'clear':
      return emptyNotepad();
  }
}

/** Accept anything that looks like a saved state (v2), or a v1 single-text notepad, and return a valid v2 state. */
export function normalise(raw: unknown): NotepadState {
  if (!raw || typeof raw !== 'object') return emptyNotepad();
  const r = raw as { version?: number; notes?: unknown; text?: unknown };
  if (Array.isArray(r.notes)) {
    const notes = r.notes.filter((n): n is Note => !!n && typeof n === 'object' && typeof (n as Note).id === 'string' && typeof (n as Note).body === 'string' && !!(n as Note).anchor)
      .map((n) => ({ ...n, anchor: { type: (ANCHOR_TYPES.includes(n.anchor.type) ? n.anchor.type : 'free') as AnchorType, id: String(n.anchor.id ?? '') } }));
    return { version: 2, notes };
  }
  if (typeof r.text === 'string' && r.text.trim()) {
    const t = new Date().toISOString();
    return { version: 2, notes: [{ id: newId(), anchor: { type: 'free', id: '' }, body: r.text, created: t, updated: t }] };
  }
  return emptyNotepad();
}

// ------------------------------------------------------------------------------------------ resolving anchors
export interface AnchorIndex {
  sections: { id: string; title: string; number: string | null }[];   // reading order
  terms: Map<string, { term: string; sections: string[] }>;
  concepts: Map<string, { title: string; sections: string[] }>;
  figures: Map<string, { label: string; title: string; sections: string[] }>;
  refs: Map<number, { citation: string; key: string; sections: string[] }>;
  /** keyed `${type}/${id}` */
  records: Map<string, { title: string; to: string }>;
}

export interface ResolvedAnchor { ok: boolean; label: string; section: string | null; to: string }

export function resolveAnchor(a: Anchor, idx: AnchorIndex): ResolvedAnchor {
  const inBody = (ids: string[]) => ids.find((s) => idx.sections.some((x) => x.id === s)) ?? null;
  switch (a.type) {
    case 'section': {
      const s = idx.sections.find((x) => x.id === a.id);
      return { ok: !!s, label: s ? `section ${s.number ? `§${s.number} ` : ''}${s.title.replace(/^\d+(\.\d+)*\.?\s+/, '')}` : `section ${a.id}`, section: s ? s.id : null, to: `/read#${a.id}` };
    }
    case 'term': {
      const t = idx.terms.get(a.id);
      return { ok: !!t, label: t ? `term “${t.term}”` : `term ${a.id}`, section: t ? inBody(t.sections) : null, to: `/glossary#${a.id}` };
    }
    case 'concept': {
      const c = idx.concepts.get(a.id);
      return { ok: !!c, label: c ? `101 “${c.title}”` : `101 ${a.id}`, section: c ? inBody(c.sections) : null, to: `/concepts/${a.id}` };
    }
    case 'figure': {
      const f = idx.figures.get(a.id);
      return { ok: !!f, label: f ? `${f.label} · ${f.title}` : `figure ${a.id}`, section: f ? inBody(f.sections) : null, to: `/figures/${a.id}` };
    }
    case 'ref': {
      const r = idx.refs.get(Number(a.id));
      return { ok: !!r, label: r ? `reference [${a.id}] ${r.key.replace(/(\d{4})/, ' $1')}` : `reference [${a.id}]`, section: r ? inBody(r.sections) : null, to: `/references#ref-${a.id}` };
    }
    case 'free':
      return { ok: true, label: 'unanchored', section: null, to: '/notes' };
    default: {
      const r = idx.records.get(`${a.type}/${a.id}`);
      const word = RECORD_WORD[a.type as RecordAnchor] ?? a.type;
      return { ok: !!r, label: r ? `${word} “${r.title}”` : `${word} ${a.id}`, section: null, to: r ? r.to : '/notes' };
    }
  }
}

export interface NoteGroup { key: string; title: string; notes: (Note & { resolved: ResolvedAnchor })[] }

/** Notes grouped in reading order, then records by type (site order), then other anchors not tied to a section, then unanchored, then orphaned anchors. */
export function groupBySection(state: NotepadState, idx: AnchorIndex): NoteGroup[] {
  const groups = new Map<string, NoteGroup>();
  for (const s of idx.sections) groups.set(s.id, { key: s.id, title: s.number ? `§${s.number} ${s.title.replace(/^\d+(\.\d+)*\.?\s+/, '')}` : s.title, notes: [] });
  const recs = new Map<string, NoteGroup>(RECORD_ANCHORS.map((t) => [t, { key: `_rec-${t}`, title: RECORD_GROUP_TITLE[t], notes: [] }]));
  const extra = { lib: { key: '_library', title: 'References, terms, 101s and figures (not tied to a section)', notes: [] as NoteGroup['notes'] }, free: { key: '_free', title: 'Unanchored', notes: [] as NoteGroup['notes'] }, orphan: { key: '_orphan', title: 'Anchors no longer in the pack (re-anchor these)', notes: [] as NoteGroup['notes'] } };
  const sorted = [...state.notes].sort((a, b) => (a.created < b.created ? -1 : a.created > b.created ? 1 : 0));
  for (const n of sorted) {
    const r = resolveAnchor(n.anchor, idx);
    const item = { ...n, resolved: r };
    if (!r.ok) extra.orphan.notes.push(item);
    else if (r.section && groups.has(r.section)) groups.get(r.section)!.notes.push(item);
    else if (n.anchor.type === 'free') extra.free.notes.push(item);
    else if (recs.has(n.anchor.type)) recs.get(n.anchor.type)!.notes.push(item);
    else extra.lib.notes.push(item);
  }
  return [...groups.values(), ...recs.values(), extra.lib, extra.free, extra.orphan].filter((g) => g.notes.length);
}

// ------------------------------------------------------------------------------------------ Markdown export / import
const MARK = 'bx-note';

export function toMarkdown(state: NotepadState, idx: AnchorIndex, meta: { title: string; slug: string; app?: string; date?: string }): string {
  const out: string[] = [
    `# Notes — ${meta.title}`,
    '',
    `_Exported ${meta.date ?? new Date().toISOString().slice(0, 10)} from ${meta.app ?? 'the Explorer'} (${meta.slug}). Organised by guide section in reading order, then by record; each note keeps its anchor and the quote it hangs on. Every note below was written by you._`,
    '',
  ];
  for (const g of groupBySection(state, idx)) {
    out.push(`## ${g.title}`, '');
    for (const n of g.notes) {
      out.push(`### ${n.resolved.label}`, '');
      if (n.quote) { out.push(...n.quote.split('\n').map((l) => `> ${l}`), ''); }
      out.push(n.body.trim() || '_(empty note)_', '');
      const metaJson = JSON.stringify({ id: n.id, anchor: n.anchor, quote: n.quote, created: n.created, updated: n.updated });
      out.push(`<!-- ${MARK} ${metaJson.replace(/--/g, '\\u002d\\u002d')} -->`, '');
    }
  }
  return out.join('\n');
}

/** Parse an exported file back into notes. A Markdown file without note markers becomes one unanchored note. */
export function fromMarkdown(md: string): Note[] {
  const re = new RegExp(`^### [^\\n]*\\n([\\s\\S]*?)<!-- ${MARK} (\\{[\\s\\S]*?\\}) -->`, 'gm');
  const notes: Note[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(md))) {
    let meta: Partial<Note>;
    try { meta = JSON.parse(m[2]) as Partial<Note>; } catch { continue; }
    const lines = m[1].split('\n');
    let i = 0;
    while (i < lines.length && (lines[i].startsWith('>') || !lines[i].trim())) i++;
    let body = lines.slice(i).join('\n').trim();
    if (body === '_(empty note)_') body = '';
    if (!meta.id || !meta.anchor) continue;
    const t = new Date().toISOString();
    notes.push({ id: meta.id, anchor: meta.anchor, quote: meta.quote, body, created: meta.created ?? t, updated: meta.updated ?? t });
  }
  if (!notes.length && md.trim()) {
    const t = new Date().toISOString();
    notes.push({ id: newId(), anchor: { type: 'free', id: '' }, body: md.trim(), created: t, updated: t });
  }
  return notes;
}
