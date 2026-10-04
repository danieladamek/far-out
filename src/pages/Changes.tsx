import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { STATUS_WORD } from '@/lib/data';
import { loadChanges, useAsync } from '@/lib/heavy';
import { findRecord } from '@/lib/records';
import Prose from '@/components/records/Prose';
import { RecordHeader, Sources } from '@/components/records/Bits';
import ReaderFigure from '@/components/reader/ReaderFigure';
import { OtherFields } from '@/components/records/RecordSections';
import type { RecordType } from '@/types';

const THEME_OF: Record<RecordType, string> = { routes: 'routes', programs: 'programs and vehicles', certifications: 'status and size', gates: 'gates', buyers: 'buyers', help: 'help', primes: 'primes', mechanics: 'mechanics', changes: 'changes' };
const BASIS_WORD: Record<string, string> = { 'secondary-only': 'secondary sources only', unread: 'governing text not read', unconfirmed: 'unconfirmed', 'primary-partial': 'primary source, read in part' };
const SHOWN = new Set(['id', 'date', 'status', 'basis', 'what', 'affects', 'sources', 'affects_files', 'changes']);

/** `/changes` — the dated ledger, newest first, filterable by status and theme (the kind of record each change affects). */
export default function Changes() {
  const changes = useAsync(loadChanges);
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? '';
  const theme = params.get('theme') ?? '';
  const set = (k: string, v: string) => { const p = new URLSearchParams(params); if (v) p.set(k, v); else p.delete(k); setParams(p, { replace: true }); };
  const themesOf = (c: NonNullable<typeof changes>[number]) => [...new Set(Object.values(c.affects_files).flat().map((t) => THEME_OF[t]))];
  const sorted = useMemo(() => [...(changes ?? [])].sort((a, b) => String(b.date).localeCompare(String(a.date))), [changes]);
  const statuses = [...new Set(sorted.map((c) => c.status))];
  const themes = [...new Set(sorted.flatMap(themesOf))].sort();
  const shown = sorted.filter((c) => (!status || c.status === status) && (!theme || themesOf(c).includes(theme)));
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl sm:text-4xl">What changed</h1>
      <p className="bx-prose mt-2">A dated record of what moved in 2025 and 2026, newest first. Each entry carries its status — final, class deviation, announced, proposed, pending implementation — links to the records it affects and to its sources, and says where it rests on secondary sources or on a text that was not read.</p>
      <ReaderFigure id="changes-timeline" />
      <div className="bx-card p-3 mt-5 grid gap-2 sm:grid-cols-2 text-sm" role="search" aria-label="Filter changes">
        <label className="block"><span className="block text-xs bx-muted mb-1">Status</span><select className="bx-input" value={status} onChange={(e) => set('status', e.target.value)}><option value="">All statuses</option>{statuses.map((s) => <option key={s} value={s}>{STATUS_WORD[s] ?? s}</option>)}</select></label>
        <label className="block"><span className="block text-xs bx-muted mb-1">Theme (what it affects)</span><select className="bx-input" value={theme} onChange={(e) => set('theme', e.target.value)}><option value="">All themes</option>{themes.map((t) => <option key={t} value={t}>{t}</option>)}</select></label>
      </div>
      <p className="mt-3 text-sm bx-muted" role="status">{changes ? `${shown.length} of ${changes.length} entries` : 'Loading…'}</p>
      <ol className="mt-4 grid gap-3">
        {shown.map((c) => (
          <li key={c.id} id={c.id} className="bx-card p-3 scroll-mt-28" data-testid={`change-${c.id}`}>
            <RecordHeader title={`${c.date}`} anchor={{ type: 'changes', id: c.id }} level={3}>
              <span className="bx-status font-semibold">{STATUS_WORD[c.status] ?? c.status}</span>
              {c.basis && c.basis !== 'primary' && <span className="bx-chip border border-dashed border-[color:var(--bx-line)] bx-muted" data-testid="change-basis">{BASIS_WORD[c.basis] ?? c.basis}</span>}
            </RecordHeader>
            <div className="mt-1"><Prose md={c.what} /></div>
            {c.affects.length > 0 && <p className="mt-2 text-sm"><span className="bx-muted">Affects: </span>{c.affects.map((a) => { const m = findRecord(a, c.affects_files[a]); return m ? <Link key={a} className="underline mr-2" to={m.to}>{m.title}</Link> : <span key={a} className="mr-2 bx-todo">{a}</span>; })}</p>}
            <OtherFields record={c} shown={SHOWN} />
            <Sources ns={c.sources} />
          </li>
        ))}
      </ol>
    </div>
  );
}
