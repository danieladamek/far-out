import { useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import pathfinderJson from '@/data/pathfinder.json';
import { loadChanges, loadGates, loadPrograms, loadRoutes, useAsync } from '@/lib/heavy';
import type { Pathfinder, Route } from '@/types';
import { findHref } from '@/lib/find-link';
import { FAMILY_LABEL } from '@/lib/data';
import Prose from '@/components/records/Prose';
import FieldView, { humanise } from '@/components/records/FieldView';
import { AsOf, BlockLabel, Conflicts, FamilyChip, ListOf, OfficialLink, PendingChanges, RecordHeader, Sources } from '@/components/records/Bits';
import NotFound from './NotFound';

const pf = pathfinderJson as unknown as Pathfinder;
const SITUATION_LABEL = Object.fromEntries(pf.questions.flatMap((q) => q.options.filter((o) => o.tag).map((o) => [o.tag!, o.label])));
/** The fixed order of KICKOFF §4b; any other key the pack carries is rendered after, never dropped. */
const KNOWN = new Set(['id', 'name', 'family', 'governing_text', 'what', 'who_for', 'how_it_works', 'benefits', 'requirements', 'steps', 'gates', 'programs', 'situations', 'modifiers', 'find_filter', 'official_url', 'pending_changes', 'as_of', 'sources', 'conflicts', 'changes']);

export function FindBlock({ r }: { r: Pick<Route, 'id' | 'name' | 'find_filter' | 'official_url'> }) {
  const f = r.find_filter;
  return (
    <section aria-label="Find opportunities" data-testid="find-block">
      <BlockLabel>Find opportunities</BlockLabel>
      {f && f.feed !== 'none' ? (
        <div className="bx-card p-3 text-sm">
          <Link className="bx-btn-primary" to={findHref(f, r.name, r.id)} data-testid="open-find">Open the opportunity search with this route's saved filter →</Link>
          <p className="mt-2 text-xs bx-muted">Saved filter from the pack: feed <strong>{f.feed}</strong>{f.keywords.length > 0 && <> · any of the words {f.keywords.map((k) => `“${k}”`).join(', ')}</>}{f.types.length > 0 && <> · notice types {f.types.join(', ')}</>}. Results come from this site's own daily copy of the public feeds.</p>
        </div>
      ) : f && f.feed === 'none' ? (
        <p className="bx-card p-3 text-sm" data-testid="no-feed">No public feed carries this route; here is the official page: {r.official_url ? <a className="underline break-all" href={r.official_url} target="_blank" rel="noreferrer">{r.official_url} ↗</a> : <span className="bx-todo">no official page in the pack</span>}</p>
      ) : (
        <p className="bx-card p-3 text-sm" data-testid="no-saved-search">The pack records no saved search for this route. The <Link className="underline" to="/find">opportunity search</Link> can still be filtered by hand; the official page is {r.official_url ? <a className="underline break-all" href={r.official_url} target="_blank" rel="noreferrer">{r.official_url} ↗</a> : <span className="bx-todo">not in the pack</span>}.</p>
      )}
    </section>
  );
}

/** `/routes/:id` — every field, in the fixed order of KICKOFF §4b. */
export default function RoutePage() {
  const { id } = useParams();
  const routes = useAsync(loadRoutes);
  const gates = useAsync(loadGates);
  const programs = useAsync(loadPrograms);
  const changes = useAsync(loadChanges);
  const r = routes?.find((x) => x.id === id);
  useEffect(() => { if (r) document.title = `${r.name} · FAR Out`; return () => { document.title = 'FAR Out'; }; }, [r]);
  const extra = useMemo(() => (r ? Object.entries(r).filter(([k]) => !KNOWN.has(k)) : []), [r]);
  if (!routes) return <div className="mx-auto max-w-3xl px-4 py-12 bx-muted" role="status">Loading…</div>;
  if (!r) return <NotFound />;

  return (
    <article className="mx-auto max-w-3xl px-4 py-8" data-testid="route-page">
      <p className="text-sm"><Link className="underline" to="/routes">Routes</Link> / <Link className="underline" to={`/routes?family=${r.family}`}>{FAMILY_LABEL[r.family]}</Link></p>
      <div className="mt-2">
        <RecordHeader title={r.name} anchor={{ type: 'routes', id: r.id }}>
          <FamilyChip family={r.family} /><AsOf date={r.as_of} />
          {r.situations.map((s) => <span key={s} className="bx-chip bg-paper-2 dark:bg-night-2">{SITUATION_LABEL[s] ?? s}</span>)}
        </RecordHeader>
      </div>
      <p className="mt-2 text-sm"><span className="font-semibold">Governing text: </span>{r.governing_text}</p>

      <BlockLabel>What it is</BlockLabel>
      <div className="bx-reader !text-[16px] !leading-7"><Prose md={r.what} /></div>
      {r.who_for && (<><BlockLabel>Who it is for</BlockLabel><Prose md={r.who_for} /></>)}
      {r.how_it_works.length > 0 && (<><BlockLabel>How it works</BlockLabel><ListOf items={r.how_it_works} /></>)}
      {r.benefits.length > 0 && (<><BlockLabel>Benefits</BlockLabel><ListOf items={r.benefits} /></>)}
      {r.requirements.length > 0 && (<><BlockLabel>Requirements</BlockLabel><ListOf items={r.requirements} /></>)}
      {r.steps.length > 0 && (<><BlockLabel>Steps</BlockLabel><ol className="list-decimal pl-5 grid gap-1">{r.steps.map((s, i) => <li key={i}><Prose md={s} /></li>)}</ol></>)}

      <section aria-label="Gates required" data-testid="gates-required">
        <BlockLabel>Gates required ({r.gates.length})</BlockLabel>
        {r.gates.length === 0 ? <p className="text-sm bx-muted">None recorded.</p> : (
          <ul className="grid gap-1.5">
            {r.gates.map((g) => {
              const gate = gates?.find((x) => x.id === g);
              return (
                <li key={g} className="text-sm border-l-2 border-[color:var(--bx-line)] pl-2">
                  {gate ? <><Link className="bx-chip border border-[color:var(--bx-line)] hover:underline mr-1.5" to={`/gates#${g}`}>{gate.name}</Link><div className="bx-muted line-clamp-2 mt-0.5"><Prose md={gate.what} /></div></>
                    : gates ? <span className="bx-todo" title="Listed on /methods as a build error">{g} — not a gate id in the pack</span> : g}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {r.programs.length > 0 && (
        <section aria-label="Programs under this route">
          <BlockLabel>Programs under this route ({r.programs.length})</BlockLabel>
          <ul className="grid gap-2 sm:grid-cols-2">
            {r.programs.map((pid) => {
              const p = programs?.find((x) => x.id === pid);
              return p ? (
                <li key={pid} className="bx-card p-2.5 text-sm">
                  <Link className="font-semibold underline" to={`/programs/${pid}`}>{p.name}</Link>
                  <p className="text-xs bx-muted">{p.kind}{p.status === 'unconfirmed' || p.status === '' ? ' · not confirmed as live' : ''}</p>
                </li>
              ) : <li key={pid} className="text-sm">{programs ? <span className="bx-todo">{pid} — not a program id in the pack</span> : pid}</li>;
            })}
          </ul>
        </section>
      )}

      <FindBlock r={r} />
      <PendingChanges items={r.pending_changes} />
      {r.changes.length > 0 && (
        <section aria-label="Changes affecting this route">
          <BlockLabel>In the dated ledger</BlockLabel>
          <ul className="grid gap-1 text-sm">{r.changes.map((c) => { const ch = changes?.find((x) => x.id === c); return <li key={c}><Link className="underline" to={`/changes#${c}`}>{ch ? `${ch.date} · ${ch.status}` : c}</Link></li>; })}</ul>
        </section>
      )}
      <Conflicts items={r.conflicts} />
      {Object.keys(r.modifiers).length > 0 && (<><BlockLabel>Modifiers used by the pathfinder</BlockLabel><p className="text-sm">{Object.entries(r.modifiers).map(([k, v]) => `${k}: ${String(v)}`).join(' · ')}</p></>)}
      {extra.map(([k, v]) => (<div key={k}><BlockLabel>{humanise(k)}</BlockLabel><FieldView value={v} name={k} /></div>))}
      <div className="mt-6"><OfficialLink url={r.official_url} /></div>
      <Sources ns={r.sources} />
      <p className="mt-6 text-sm bx-muted">This record is as of {r.as_of}. It states what the governing texts and official pages say; it is not advice.</p>
    </article>
  );
}
