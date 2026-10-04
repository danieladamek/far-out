import { useSearchParams } from 'react-router-dom';
import { loadHelp, useAsync } from '@/lib/heavy';
import Prose from '@/components/records/Prose';
import { AsOf, Conflicts, OfficialLink, PendingChanges, RecordHeader, Sources } from '@/components/records/Bits';
import { Disclosure, Field, OtherFields } from '@/components/records/RecordSections';
import { findRecord } from '@/lib/records';
import { Link } from 'react-router-dom';

const KIND_LABEL: Record<string, string> = { '': 'Help-organisation types', event: 'Events', 'event-series': 'Event series', programme: 'Outreach and matchmaking programmes', directory: 'Directories of primes', calendar: 'Calendars', office: 'Offices' };
const SHOWN = new Set(['id', 'name', 'kind', 'owner', 'what', 'who_for', 'how_to_find', 'cadence', 'how_to_register', 'related', 'official_url', 'pending_changes', 'as_of', 'sources', 'conflicts', 'changes']);

/** `/help` — help-organisation types, outreach and matchmaking, directories of primes; filterable by kind. */
export default function Help() {
  const help = useAsync(loadHelp);
  const [params, setParams] = useSearchParams();
  const kind = params.get('kind');
  const kinds = [...new Set((help ?? []).map((h) => String(h.kind ?? '')))];
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl sm:text-4xl">Help</h1>
      <p className="bx-prose mt-2">The organisations that assist small firms, the outreach and matchmaking programmes and events (with cadence and how to register as the pages state them), and the directories of primes.</p>
      <div className="mt-4 flex flex-wrap gap-1.5 text-sm" role="group" aria-label="Filter by kind">
        <button type="button" className={`bx-btn !py-0.5 ${kind === null ? 'bx-btn-on' : ''}`} aria-pressed={kind === null} onClick={() => setParams({}, { replace: true })}>All ({help?.length ?? 0})</button>
        {kinds.map((k) => <button key={k} type="button" className={`bx-btn !py-0.5 ${kind === k ? 'bx-btn-on' : ''}`} aria-pressed={kind === k} onClick={() => setParams({ kind: k }, { replace: true })}>{KIND_LABEL[k] ?? k} ({(help ?? []).filter((h) => String(h.kind ?? '') === k).length})</button>)}
      </div>
      {!help && <p className="bx-muted" role="status">Loading…</p>}
      {kinds.filter((k) => kind === null || k === kind).map((k) => (
        <section key={k} className="mt-8" aria-labelledby={`hk-${k || 'types'}`}>
          <h2 id={`hk-${k || 'types'}`} className="text-2xl">{KIND_LABEL[k] ?? k}</h2>
          <div className="mt-3 grid gap-2">
            {(help ?? []).filter((h) => String(h.kind ?? '') === k).map((h) => (
              <Disclosure key={h.id} id={h.id} summary={<><span className="font-semibold">{String(h.name)}</span>{h.owner ? <span className="block text-xs bx-muted">{String(h.owner)}</span> : null}</>}>
                <RecordHeader title={String(h.name)} anchor={{ type: 'help', id: h.id }} level={3}><AsOf date={h.as_of} /></RecordHeader>
                <div className="mt-2"><Prose md={String(h.what)} /></div>
                <Field label="Who it is for" value={h.who_for} />
                <Field label="How to find one" value={h.how_to_find} />
                <Field label="Cadence" value={h.cadence} />
                <Field label="How to register" value={h.how_to_register} />
                {Array.isArray(h.related) && (h.related as string[]).length > 0 && (
                  <p className="mt-3 text-sm"><span className="font-semibold">Related: </span>{(h.related as string[]).map((id) => { const m = findRecord(id); return m ? <Link key={id} className="underline mr-2" to={m.to}>{m.title}</Link> : <span key={id} className="mr-2">{id}</span>; })}</p>
                )}
                <PendingChanges items={h.pending_changes} />
                <Conflicts items={h.conflicts} />
                <OtherFields record={h} shown={SHOWN} />
                <div className="mt-4"><OfficialLink url={h.official_url} /></div>
                <Sources ns={h.sources} />
              </Disclosure>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
