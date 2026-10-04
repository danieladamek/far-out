import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { familyColour, FAMILIES, FAMILY_LABEL } from '@/lib/data';
import { loadPrograms, useAsync } from '@/lib/heavy';
import { isUnconfirmed } from './ProgramPage';

const KIND_LABEL: Record<string, string> = { program: 'Programs', 'front-door': 'Innovation front doors', vehicle: 'Contract vehicles', transition: 'Transition programs', consortium: 'OT consortia', 'consortium-manager': 'Consortium managers' };

/** `/programs` — every program, vehicle, front door, transition program, consortium and manager in the pack. */
export default function Programs() {
  const programs = useAsync(loadPrograms);
  const [params, setParams] = useSearchParams();
  const kind = params.get('kind') ?? '';
  const family = params.get('family') ?? '';
  const q = params.get('q') ?? '';
  const set = (k: string, v: string) => { const p = new URLSearchParams(params); if (v) p.set(k, v); else p.delete(k); setParams(p, { replace: true }); };
  const kinds = useMemo(() => [...new Set((programs ?? []).map((p) => p.kind))], [programs]);
  const shown = (programs ?? []).filter((p) => (!kind || p.kind === kind) && (!family || p.family === family) && (!q || `${p.name} ${String(p.acronym ?? '')} ${p.id}`.toLowerCase().includes(q.toLowerCase())));
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl sm:text-4xl">Programs, vehicles and consortia</h1>
      <p className="bx-prose mt-2 max-w-3xl">The programs, contract vehicles, front doors, transition programs, Other Transaction consortia and consortium managers the routes run through. A record not confirmed as live on the sweep date carries a banner saying so.</p>
      <div className="bx-card p-3 mt-5 grid gap-2 sm:grid-cols-3 text-sm" role="search" aria-label="Filter programs">
        <label className="block"><span className="block text-xs bx-muted mb-1">Kind</span><select className="bx-input" value={kind} onChange={(e) => set('kind', e.target.value)}><option value="">All kinds</option>{kinds.map((k) => <option key={k} value={k}>{KIND_LABEL[k] ?? k}</option>)}</select></label>
        <label className="block"><span className="block text-xs bx-muted mb-1">Family</span><select className="bx-input" value={family} onChange={(e) => set('family', e.target.value)}><option value="">All families</option>{FAMILIES.map((f) => <option key={f} value={f}>{FAMILY_LABEL[f]}</option>)}</select></label>
        <label className="block"><span className="block text-xs bx-muted mb-1">Name contains</span><input className="bx-input" value={q} onChange={(e) => set('q', e.target.value)} /></label>
      </div>
      <p className="mt-3 text-sm bx-muted" role="status">{programs ? `${shown.length} of ${programs.length}` : 'Loading…'}</p>
      {kinds.filter((k) => !kind || k === kind).map((k) => {
        const list = shown.filter((p) => p.kind === k);
        if (!list.length) return null;
        return (
          <section key={k} className="mt-6" aria-labelledby={`k-${k}`}>
            <h2 id={`k-${k}`} className="text-2xl">{KIND_LABEL[k] ?? k} <span className="bx-muted text-base font-body">({list.length})</span></h2>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((p) => (
                <li key={p.id} className="bx-card p-3 border-l-4 text-sm" style={{ borderLeftColor: familyColour(p.family) }}>
                  <Link className="font-semibold underline" to={`/programs/${p.id}`}>{p.name}{p.acronym ? ` (${String(p.acronym)})` : ''}</Link>
                  <p className="text-xs bx-muted mt-0.5">{p.family ? FAMILY_LABEL[p.family] : 'no family recorded'}{p.owner ? ` · ${String(p.owner).slice(0, 80)}` : ''}</p>
                  {isUnconfirmed(p) && <p className="mt-1"><span className="bx-todo">not confirmed as live on {p.as_of}</span></p>}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
