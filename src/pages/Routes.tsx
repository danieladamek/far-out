import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import pathfinderJson from '@/data/pathfinder.json';
import { AS_OF, familyColour, FAMILIES, FAMILY_LABEL } from '@/lib/data';
import { loadGates, loadRoutes, useAsync } from '@/lib/heavy';
import type { Pathfinder } from '@/types';
import Prose from '@/components/records/Prose';

const pf = pathfinderJson as unknown as Pathfinder;
const SITUATION_LABEL = Object.fromEntries(pf.questions.flatMap((q) => q.options.filter((o) => o.tag).map((o) => [o.tag!, o.label])));
const MODIFIER_LABEL: Record<string, string> = { rd: 'Research and development', product: 'A product', service: 'A service', 'defense:true': 'Defense', 'defense:false': 'Civilian' };

/** `/routes` — the catalogue, filterable by family, situation, modifier, gate and saved search; filters live in the URL. */
export default function Routes() {
  const routes = useAsync(loadRoutes);
  const gates = useAsync(loadGates);
  const [params, setParams] = useSearchParams();
  const family = params.get('family') ?? '';
  const situation = params.get('situation') ?? '';
  const modifier = params.get('modifier') ?? '';
  const gate = params.get('gate') ?? '';
  const feed = params.get('feed') ?? '';
  const q = params.get('q') ?? '';
  const set = (k: string, v: string) => { const p = new URLSearchParams(params); if (v) p.set(k, v); else p.delete(k); setParams(p, { replace: true }); };

  const modifierKeys = useMemo(() => [...new Set((routes ?? []).flatMap((r) => Object.entries(r.modifiers).map(([k, v]) => (k === 'defense' ? `defense:${v}` : v === true ? k : null)).filter(Boolean) as string[]))], [routes]);
  const usedGates = useMemo(() => [...new Set((routes ?? []).flatMap((r) => r.gates))].sort(), [routes]);
  const gateName = (id: string) => gates?.find((g) => g.id === id)?.name ?? id;

  const shown = useMemo(() => (routes ?? []).filter((r) =>
    (!family || r.family === family) &&
    (!situation || r.situations.includes(situation)) &&
    (!modifier || (modifier.startsWith('defense:') ? String(r.modifiers.defense) === modifier.slice(8) : r.modifiers[modifier] === true)) &&
    (!gate || r.gates.includes(gate)) &&
    (!feed || (feed === 'yes' ? !!r.find_filter && r.find_filter.feed !== 'none' : !r.find_filter || r.find_filter.feed === 'none')) &&
    (!q || `${r.name} ${r.id} ${r.governing_text}`.toLowerCase().includes(q.toLowerCase())),
  ), [routes, family, situation, modifier, gate, feed, q]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl sm:text-4xl">Routes</h1>
      <p className="bx-prose mt-2 max-w-3xl">Every route into federal work the guide records, in four families. Each route page lists what the route is, the gates it requires, the programs under it, a saved search into the opportunity feed where one exists, pending changes, where official sources differ, and its sources. Records as of {AS_OF}.</p>

      <div className="bx-card p-3 mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 text-sm" role="search" aria-label="Filter routes">
        <label className="block"><span className="block text-xs bx-muted mb-1">Family</span>
          <select className="bx-input" value={family} onChange={(e) => set('family', e.target.value)} data-testid="filter-family"><option value="">All families</option>{FAMILIES.map((f) => <option key={f} value={f}>{FAMILY_LABEL[f]}</option>)}</select></label>
        <label className="block"><span className="block text-xs bx-muted mb-1">Situation</span>
          <select className="bx-input" value={situation} onChange={(e) => set('situation', e.target.value)}><option value="">Any situation</option>{Object.entries(SITUATION_LABEL).map(([t, l]) => <option key={t} value={t}>{l}</option>)}</select></label>
        <label className="block"><span className="block text-xs bx-muted mb-1">Modifier</span>
          <select className="bx-input" value={modifier} onChange={(e) => set('modifier', e.target.value)}><option value="">Any</option>{modifierKeys.map((m) => <option key={m} value={m}>{MODIFIER_LABEL[m] ?? m}</option>)}</select></label>
        <label className="block"><span className="block text-xs bx-muted mb-1">Requires gate</span>
          <select className="bx-input" value={gate} onChange={(e) => set('gate', e.target.value)}><option value="">Any gate</option>{usedGates.map((g) => <option key={g} value={g}>{gateName(g)}</option>)}</select></label>
        <label className="block"><span className="block text-xs bx-muted mb-1">Saved search into /find</span>
          <select className="bx-input" value={feed} onChange={(e) => set('feed', e.target.value)}><option value="">Either</option><option value="yes">Has a saved search</option><option value="no">No public feed / no saved search</option></select></label>
        <label className="block"><span className="block text-xs bx-muted mb-1">Name contains</span>
          <input className="bx-input" value={q} onChange={(e) => set('q', e.target.value)} placeholder="e.g. mentor" /></label>
      </div>
      <p className="mt-3 text-sm bx-muted" role="status">{routes ? `${shown.length} of ${routes.length} routes` : 'Loading…'}{(family || situation || modifier || gate || feed || q) && <> · <button type="button" className="underline" onClick={() => setParams({}, { replace: true })}>clear filters</button></>}</p>

      {FAMILIES.filter((f) => !family || f === family).map((f) => {
        const list = shown.filter((r) => r.family === f);
        if (!list.length) return null;
        return (
          <section key={f} className="mt-6" aria-labelledby={`fam-${f}`}>
            <h2 id={`fam-${f}`} className="text-2xl flex items-center gap-2"><span aria-hidden="true" className="inline-block h-3 w-3 rounded-full" style={{ background: familyColour(f) }} />{FAMILY_LABEL[f]}</h2>
            <ul className="mt-3 grid gap-3 md:grid-cols-2">
              {list.map((r) => (
                <li key={r.id} className="bx-card p-3 border-l-4" style={{ borderLeftColor: familyColour(r.family) }} data-testid={`route-card-${r.id}`}>
                  <Link className="font-semibold underline" to={`/routes/${r.id}`}>{r.name}</Link>
                  <p className="text-xs bx-muted mt-0.5">{r.governing_text}</p>
                  <div className="mt-1.5 text-sm line-clamp-3"><Prose md={r.what} /></div>
                  <p className="mt-1.5 flex flex-wrap gap-1 text-xs">
                    {r.situations.map((s) => <span key={s} className="bx-chip bg-paper-2 dark:bg-night-2">{SITUATION_LABEL[s] ?? s}</span>)}
                    <span className="bx-chip border border-[color:var(--bx-line)] bx-muted">{r.gates.length} gate{r.gates.length === 1 ? '' : 's'}</span>
                    {r.find_filter && r.find_filter.feed !== 'none' && <span className="bx-chip border border-[color:var(--bx-line)] bx-muted">saved search</span>}
                    {r.pending_changes.length > 0 && <span className="bx-chip border border-[color:var(--bx-line)] bx-muted">{r.pending_changes.length} pending/recent change{r.pending_changes.length === 1 ? '' : 's'}</span>}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
