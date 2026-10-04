import { useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { loadPrograms, loadRoutes, useAsync } from '@/lib/heavy';
import type { Program } from '@/types';
import Prose from '@/components/records/Prose';
import FieldView, { humanise } from '@/components/records/FieldView';
import CiteList from '@/components/records/CiteList';
import { AsOf, BlockLabel, Conflicts, FamilyChip, ListOf, OfficialLink, PendingChanges, RecordHeader, RecordLinks, Sources } from '@/components/records/Bits';
import { FindBlock } from './RoutePage';
import NotFound from './NotFound';

export const isUnconfirmed = (p: Pick<Program, 'status'>) => p.status === 'unconfirmed' || p.status === '' || p.status === 'empty';
const SHOWN = new Set(['id', 'name', 'acronym', 'family', 'kind', 'status', 'status_note', 'owner', 'agency', 'defense', 'what', 'distinctive', 'funds_or_buys', 'eligibility', 'cycle', 'awards', 'steps', 'portal', 'registrations', 'gates', 'situations', 'modifiers', 'find_filter', 'manager', 'sponsors', 'domain', 'agreement_number', 'ceiling', 'membership', 'fees_on_awards', 'non_member_visibility', 'opportunity_process', 'award_form', 'statistics', 'ordering', 'obligations', 'official_url', 'pending_changes', 'as_of', 'sources', 'conflicts', 'changes', 'routes']);

interface Fee { tier?: string; amount?: string; period?: string; cite?: number[]; [k: string]: unknown }
interface Membership { eligibility?: string[]; fees?: Fee[]; fees_note?: string; how_to_join?: string[]; what_it_gives?: string[]; [k: string]: unknown }

function Field({ label, value, name }: { label: string; value: unknown; name?: string }) {
  if (value === undefined || value === null || value === '' || (Array.isArray(value) && !value.length)) return null;
  return (<><BlockLabel>{label}</BlockLabel>{Array.isArray(value) && value.every((x) => typeof x === 'string') ? <ListOf items={value as string[]} /> : <FieldView value={value} name={name} />}</>);
}

/** `/programs/:id` — programs, vehicles, front doors, transition programs, consortia and their managers. */
export default function ProgramPage() {
  const { id } = useParams();
  const programs = useAsync(loadPrograms);
  const routes = useAsync(loadRoutes);
  const p = programs?.find((x) => x.id === id);
  useEffect(() => { if (p) document.title = `${p.name} · FAR Out`; return () => { document.title = 'FAR Out'; }; }, [p]);
  const extra = useMemo(() => (p ? Object.entries(p).filter(([k]) => !SHOWN.has(k)) : []), [p]);
  if (!programs) return <div className="mx-auto max-w-3xl px-4 py-12 bx-muted" role="status">Loading…</div>;
  if (!p) return <NotFound />;
  const m = p.membership as Membership | undefined;
  const consortium = p.kind === 'consortium' || p.kind === 'consortium-manager';
  const cycle = p.cycle as { pattern?: string; current_solicitations?: unknown[]; [k: string]: unknown } | undefined;

  return (
    <article className="mx-auto max-w-3xl px-4 py-8" data-testid="program-page">
      <p className="text-sm"><Link className="underline" to="/programs">Programs</Link></p>
      <div className="mt-2">
        <RecordHeader title={`${p.name}${p.acronym ? ` (${String(p.acronym)})` : ''}`} anchor={{ type: 'programs', id: p.id }}>
          <FamilyChip family={p.family} /><span className="bx-chip bg-paper-2 dark:bg-night-2">{p.kind}</span><AsOf date={p.as_of} />
        </RecordHeader>
      </div>
      {isUnconfirmed(p) && (
        <div className="bx-card mt-4 p-3 border-l-4 border-l-amber-500 text-sm" role="note" data-testid="unconfirmed-banner">
          <p className="font-semibold">Not confirmed as live on {p.as_of}.</p>
          {p.status_note && <Prose md={p.status_note} className="mt-1" />}
          {!p.status_note && p.conflicts.length > 0 && <Prose md={p.conflicts[0]} className="mt-1" />}
        </div>
      )}
      {(p.owner || p.agency) ? <p className="mt-3 text-sm">{p.owner ? <><span className="font-semibold">Owner: </span>{String(p.owner)}</> : null}{p.agency ? <span className="bx-muted"> · {String(p.agency)}{p.defense === true ? ' · defense' : p.defense === false ? ' · civilian' : ''}</span> : null}</p> : null}

      {p.what ? (<><BlockLabel>What it is</BlockLabel><div className="bx-reader !text-[16px] !leading-7"><Prose md={p.what} /></div></>) : <p className="mt-4"><span className="bx-todo">TODO(author): no description in the pack</span></p>}
      {p.distinctive && <Field label="As the agency frames it" value={p.distinctive} />}
      {!isUnconfirmed(p) && p.status && <Field label="Status" value={p.status} />}
      {!isUnconfirmed(p) && p.status_note && <Field label="Status note" value={p.status_note} />}
      <Field label="Ordering" value={p.ordering} name="ordering" />
      <Field label="Obligations" value={p.obligations} name="obligations" />
      <Field label="Funds or buys" value={p.funds_or_buys} />

      {consortium && (
        <section aria-label="Consortium" data-testid="consortium">
          <Field label="Manager" value={p.manager} />
          <Field label="Sponsors" value={p.sponsors} />
          <Field label="Technical domain" value={p.domain} />
          <Field label="Agreement number" value={p.agreement_number} />
          <Field label="Ceiling" value={p.ceiling} />
          {m && (
            <>
              <BlockLabel>Membership</BlockLabel>
              <div className="bx-card p-3 grid gap-3 text-sm" data-testid="membership">
                {m.eligibility?.length ? <div><p className="font-semibold">Eligibility</p><ListOf items={m.eligibility} /></div> : null}
                {m.fees?.length ? (
                  <div>
                    <p className="font-semibold">Fees, by tier, exactly as posted</p>
                    <div className="overflow-x-auto"><table className="bx-table mt-1" data-testid="fees-table">
                      <thead><tr><th scope="col">Tier</th><th scope="col">Amount</th><th scope="col">Period</th><th scope="col">Sources</th></tr></thead>
                      <tbody>{m.fees.map((f, i) => <tr key={i}><td>{f.tier ?? '—'}</td><td className="whitespace-nowrap">{f.amount ?? '—'}</td><td>{f.period ?? '—'}</td><td>{f.cite ? <CiteList ns={f.cite} /> : '—'}</td></tr>)}</tbody>
                    </table></div>
                  </div>
                ) : <p><span className="bx-todo">TODO(author): no fee schedule in the pack</span></p>}
                {m.fees_note && <Prose md={m.fees_note} />}
                {m.how_to_join?.length ? <div><p className="font-semibold">How to join</p><ListOf items={m.how_to_join} /></div> : null}
                {m.what_it_gives?.length ? <div><p className="font-semibold">What it gives</p><ListOf items={m.what_it_gives} /></div> : null}
                {Object.entries(m).filter(([k]) => !['eligibility', 'fees', 'fees_note', 'how_to_join', 'what_it_gives'].includes(k)).map(([k, v]) => <div key={k}><p className="font-semibold">{humanise(k)}</p><FieldView value={v} name={k} /></div>)}
              </div>
            </>
          )}
          <Field label="Fees on awards" value={p.fees_on_awards} />
          <Field label="What non-members can see" value={p.non_member_visibility} />
          <Field label="How opportunities are run" value={p.opportunity_process} />
          <Field label="Award form" value={p.award_form} />
          <Field label="Statistics, as the consortium states them" value={p.statistics} />
        </section>
      )}

      <Field label="Eligibility" value={p.eligibility} />
      {cycle && (cycle.pattern || cycle.current_solicitations?.length) ? (<><BlockLabel>Cycle</BlockLabel><FieldView value={cycle} /></>) : null}
      <Field label="Awards, exactly as stated" value={p.awards} name="awards" />
      {p.steps.length > 0 && (<><BlockLabel>Steps</BlockLabel><ol className="list-decimal pl-5 grid gap-1">{p.steps.map((s, i) => <li key={i}><Prose md={s} /></li>)}</ol></>)}
      {p.portal ? <><BlockLabel>Portal</BlockLabel><FieldView value={p.portal} /></> : null}
      {Array.isArray(p.registrations) && (p.registrations as string[]).length > 0 && (<><BlockLabel>Registrations named</BlockLabel><p className="flex flex-wrap gap-1.5">{(p.registrations as string[]).map((x) => <span key={x} className="bx-chip bg-paper-2 dark:bg-night-2">{x}</span>)}</p></>)}
      {p.gates.length > 0 && (<><BlockLabel>Gates</BlockLabel><RecordLinks type="gates" ids={p.gates} /></>)}
      {p.find_filter && <FindBlock r={{ id: p.id, name: p.name, find_filter: p.find_filter, official_url: p.official_url }} />}
      {p.routes.length > 0 && (<><BlockLabel>Routes that list this program</BlockLabel><p className="flex flex-wrap gap-1.5">{p.routes.map((rid) => <Link key={rid} className="bx-chip border border-[color:var(--bx-line)] hover:underline" to={`/routes/${rid}`}>{routes?.find((x) => x.id === rid)?.name ?? rid}</Link>)}</p></>)}
      <PendingChanges items={p.pending_changes} />
      <Conflicts items={p.conflicts} />
      {extra.map(([k, v]) => <Field key={k} label={humanise(k)} value={v} name={k} />)}
      <div className="mt-6"><OfficialLink url={p.official_url} /></div>
      <Sources ns={p.sources} />
      <p className="mt-6 text-sm bx-muted">This record is as of {p.as_of}. It states what the official pages say; it is not advice.</p>
    </article>
  );
}
