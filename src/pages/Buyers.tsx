import { loadBuyers, useAsync } from '@/lib/heavy';
import type { RecordBase } from '@/types';
import Prose from '@/components/records/Prose';
import { AsOf, BlockLabel, Conflicts, OfficialLink, PendingChanges, RecordHeader, Sources } from '@/components/records/Bits';
import { Disclosure, Field, OtherFields } from '@/components/records/RecordSections';

const PATHWAY_SHOWN = new Set(['id', 'name', 'kind', 'governing_text', 'date', 'date_note', 'what', 'timelines', 'decision_authority', 'industry_entry', 'official_url', 'pending_changes', 'as_of', 'sources', 'conflicts', 'changes', 'component_of']);
const OFFICE_SHOWN = new Set(['id', 'agency', 'office_name', 'forecast_url', 'verified', 'sweep_status', 'forecast_note', 'what_else', 'as_of', 'sources', 'changes', 'pending_changes', 'conflicts', 'component_of', 'office_url']);

/** `/buyers` — the buyer's map (eight pathway records), then the 32 agency small-business offices, verified forecasts first. */
export default function Buyers() {
  const buyers = useAsync(loadBuyers);
  const pathways = (buyers ?? []).filter((b) => b.kind === 'buyer-pathway');
  const offices = (buyers ?? []).filter((b) => b.kind !== 'buyer-pathway').sort((a, b) => Number(b.verified === true) - Number(a.verified === true) || String(a.agency).localeCompare(String(b.agency)));
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl sm:text-4xl">Buyers</h1>
      <p className="bx-prose mt-2">How the government on the other side of the table plans and buys: the defense acquisition pathways, the civilian model and the grants model, each with its governing text and date, timelines, who decides, and where industry comes in as the text states it. Then the agency small-business offices and where each posts its forecast.</p>
      {!buyers && <p className="bx-muted" role="status">Loading…</p>}
      <section className="mt-6" aria-labelledby="map-h">
        <h2 id="map-h" className="text-2xl">The buyer's map</h2>
        <div className="mt-3 grid gap-2">
          {pathways.map((b) => (
            <Disclosure key={b.id} id={b.id} summary={<><span className="font-semibold">{String(b.name)}</span><span className="block text-xs bx-muted">{String(b.governing_text ?? '').replace(/\s*\[\d[^\]]*\]/g, '').slice(0, 140)}{b.date ? ` · ${String(b.date)}` : ''}</span></>}>
              <RecordHeader title={String(b.name)} anchor={{ type: 'buyers', id: b.id }} level={3}><AsOf date={b.as_of} /></RecordHeader>
              <Field label="Governing text" value={b.governing_text} />
              <Field label="Date" value={b.date} />
              <Field label="Date note" value={b.date_note} />
              <BlockLabel>What it is</BlockLabel><Prose md={String(b.what ?? '')} />
              <Field label="Timelines" value={b.timelines} />
              <Field label="Decision authority" value={b.decision_authority} />
              <div data-testid="industry-entry"><Field label="Where industry enters, as the text states it" value={b.industry_entry} /></div>
              <PendingChanges items={b.pending_changes} />
              <Conflicts items={b.conflicts} />
              <OtherFields record={b} shown={PATHWAY_SHOWN} />
              <div className="mt-4"><OfficialLink url={b.official_url} /></div>
              <Sources ns={b.sources} />
            </Disclosure>
          ))}
        </div>
      </section>
      <section className="mt-10" aria-labelledby="dir-h">
        <h2 id="dir-h" className="text-2xl">Agency small-business offices and forecasts</h2>
        <p className="text-sm bx-muted mt-1">{offices.filter((o) => o.verified === true).length} of {offices.length} forecast pages were verified in the sweep; those come first. Unverified ones are marked.</p>
        <ul className="mt-3 grid gap-2">
          {offices.map((o: RecordBase) => (
            <li key={o.id} id={o.id} className="bx-card p-3 scroll-mt-28 text-sm" data-testid={`office-${o.id}`}>
              <RecordHeader title={`${String(o.agency)} — ${String(o.office_name ?? '')}`} anchor={{ type: 'buyers', id: o.id }} level={3}>
                {o.verified === true ? <span className="bx-chip border border-[color:var(--bx-line)]">forecast page verified</span> : <span className="bx-todo">forecast page not verified</span>}
                {o.sweep_status ? <span className="bx-muted">sweep: {String(o.sweep_status)}</span> : null}
                {o.component_of ? <span className="bx-muted">component of {String(o.component_of)}</span> : null}
                <AsOf date={o.as_of} />
              </RecordHeader>
              {o.forecast_url ? <p className="mt-2"><span className="font-semibold">Forecast: </span><a className="underline break-all" href={String(o.forecast_url)} target="_blank" rel="noreferrer">{String(o.forecast_url)} ↗</a></p> : <p className="mt-2"><span className="bx-todo">TODO(author): no forecast URL in the pack</span></p>}
              {o.office_url ? <p><span className="font-semibold">Office: </span><a className="underline break-all" href={String(o.office_url)} target="_blank" rel="noreferrer">{String(o.office_url)} ↗</a></p> : null}
              <Field label="Forecast note" value={o.forecast_note} />
              <Field label="What else the office offers" value={o.what_else} />
              <PendingChanges items={o.pending_changes} />
              <Conflicts items={o.conflicts} />
              <OtherFields record={o} shown={OFFICE_SHOWN} />
              <Sources ns={o.sources} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
