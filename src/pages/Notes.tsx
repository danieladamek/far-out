import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { conceptsIndex, figuresIndex, sectionsIndex, terms } from '@/lib/data';
import { recordsIndex, referencesIndex } from '@/lib/extras';
import { useNotepad } from '@/lib/notepad-context';
import { groupBySection, RECORD_ANCHORS, type AnchorType, type RecordAnchor } from '@/lib/notepad';
import { exportNotes, NoteEditor, SaveStatus, useAnchorIndex, useImport } from '@/components/notepad/NotepadPanel';

const TYPE_LABEL: Record<AnchorType, string> = {
  section: 'a guide section', routes: 'a route', programs: 'a program or vehicle', certifications: 'a certification', gates: 'a gate', buyers: 'a buyer',
  help: 'a help entry', primes: 'a prime', mechanics: 'a how-it-works page', changes: 'a dated change', ref: 'a reference', figure: 'a figure', concept: 'a 101', term: 'a glossary term', free: 'nothing',
};

/**
 * The notepad as a page (APP-SPEC §2, §3.1): every note, what it hangs on, in reading order; export and import.
 * Every word in a note is the reader's.
 */
export default function Notes() {
  const np = useNotepad();
  const idx = useAnchorIndex();
  const importFiles = useImport();
  const fileRef = useRef<HTMLInputElement>(null);
  const [type, setType] = useState<AnchorType>('section');
  const [anchorId, setAnchorId] = useState('');
  const groups = useMemo(() => (idx ? groupBySection(np.state, idx) : []), [np.state, idx]);
  const options = useMemo(() => {
    switch (type) {
      case 'section': return sectionsIndex.map((s) => ({ id: s.id, label: s.title }));
      case 'ref': return referencesIndex.map((r) => ({ id: String(r.n), label: `[${r.n}] ${r.citation.slice(0, 80)}` }));
      case 'figure': return figuresIndex.map((f) => ({ id: f.id, label: `${f.label} · ${f.title}` }));
      case 'concept': return conceptsIndex.map((c) => ({ id: c.id, label: c.title }));
      case 'term': return [...terms].sort((a, b) => a.term.localeCompare(b.term)).map((t) => ({ id: t.id, label: t.term }));
      case 'free': return [];
      default: return (RECORD_ANCHORS as readonly string[]).includes(type) ? recordsIndex.filter((r) => r.type === (type as RecordAnchor)).map((r) => ({ id: r.id, label: r.title.slice(0, 100) })) : [];
    }
  }, [type]);
  const add = () => {
    if (type !== 'free' && !anchorId) return;
    np.addNote({ type, id: type === 'free' ? '' : anchorId });
  };
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl sm:text-4xl">Notes</h1>
      <p className="bx-prose mt-2">
        Notes on this guide, in its reading order. A note can hang on a guide section, any record (a route, a program, a gate, a buyer…), a
        reference, a figure, a 101 or a glossary term — or select text on <Link className="underline" to="/read">Read</Link> to quote it. Notes stay
        in this browser; nothing is sent anywhere. Export writes them as Markdown organised by section, then by record; import reads that file back.
      </p>
      <div className="mt-2"><SaveStatus file={np.file} /></div>
      <section className="bx-card p-3 mt-5 text-sm no-print" aria-labelledby="new-h">
        <h2 id="new-h" className="text-lg">New note</h2>
        <div className="mt-2 grid gap-2 sm:grid-cols-[11rem_minmax(0,1fr)_auto] items-end">
          <label className="block"><span className="block text-xs bx-muted mb-1">Anchor to</span>
            <select className="bx-input" value={type} onChange={(e) => { setType(e.target.value as AnchorType); setAnchorId(''); }} data-testid="anchor-type">
              {(Object.keys(TYPE_LABEL) as AnchorType[]).map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
            </select></label>
          {type !== 'free' ? (
            <label className="block min-w-0"><span className="block text-xs bx-muted mb-1">Which</span>
              <select className="bx-input" value={anchorId} onChange={(e) => setAnchorId(e.target.value)} data-testid="anchor-id"><option value="">choose…</option>{options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select></label>
          ) : <span />}
          <button type="button" className="bx-btn-primary" onClick={add} disabled={type !== 'free' && !anchorId} data-testid="add-anchored-note">Add note</button>
        </div>
      </section>
      <div className="mt-4 flex flex-wrap gap-2 no-print">
        <button type="button" className="bx-btn" disabled={!idx || !np.state.notes.length} onClick={() => idx && exportNotes(np.state, idx)} data-testid="export-notes">Export notes (.md, by section)</button>
        <button type="button" className="bx-btn" onClick={() => fileRef.current?.click()}>Import</button>
        <input ref={fileRef} type="file" multiple accept=".md,text/markdown,text/plain" className="sr-only" aria-label="Import notes (.md)" data-testid="import-notes" onChange={(e) => { const fs = e.target.files; if (fs?.length) void importFiles(fs); e.target.value = ''; }} />
        <span className="text-sm bx-muted self-center" role="status">{np.state.notes.length} note{np.state.notes.length === 1 ? '' : 's'}</span>
      </div>
      {!idx ? <p className="mt-6 bx-muted" role="status">Loading…</p> : groups.length === 0 ? <p className="mt-6 bx-muted">No notes yet. Select text on <Link className="underline" to="/read">Read</Link>, use ✎ Note on any record or reference card, or add one above.</p> : (
        <div className="mt-6 grid gap-8">
          {groups.map((g) => (
            <section key={g.key} aria-labelledby={`ng-${g.key}`}>
              <h2 id={`ng-${g.key}`} className="text-xl">{g.title}</h2>
              <ul className="mt-2 grid gap-2">{g.notes.map((n) => <NoteEditor key={n.id} note={n} idx={idx} autoFocus={np.focusId === n.id} />)}</ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
