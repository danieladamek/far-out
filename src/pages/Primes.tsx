import { loadPrimes, useAsync } from '@/lib/heavy';
import Prose from '@/components/records/Prose';
import { AsOf, RecordHeader, Sources } from '@/components/records/Bits';
import { Field, OtherFields } from '@/components/records/RecordSections';

const SHOWN = new Set(['id', 'name', 'supplier_portal_url', 'portal_note', 'registration_asks', 'liaison_named', 'programs', 'selection_statement', 'forecast_statement', 'also_states', 'unreadable', 'as_of', 'sources', 'changes', 'pending_changes', 'conflicts']);

/** `/primes` — one card per prime, rendering only what the company's own pages say. No ranking, no commentary. */
export default function Primes() {
  const primes = useAsync(loadPrimes);
  const sorted = [...(primes ?? [])].sort((a, b) => String(a.name).localeCompare(String(b.name)));
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl sm:text-4xl">Primes</h1>
      <p className="bx-prose mt-2">Large prime contractors' supplier pages, as each company states them. Each card records the company's page as read on its as-of date: what registration asks for, whether a liaison is named, the programs it names, what it says about selection and forecasts, and what could not be read. Alphabetical; no ranking, no commentary.</p>
      {!primes && <p className="bx-muted" role="status">Loading…</p>}
      <ul className="mt-6 grid gap-4">
        {sorted.map((p) => (
          <li key={p.id} id={p.id} className="bx-card p-4 scroll-mt-28" data-testid={`prime-${p.id}`}>
            <RecordHeader title={String(p.name)} anchor={{ type: 'primes', id: p.id }} level={2}><AsOf date={p.as_of} /></RecordHeader>
            <p className="text-xs bx-muted mt-1">This card records the company's page as read on {p.as_of}.</p>
            {p.supplier_portal_url ? <p className="mt-2 text-sm"><span className="font-semibold">Supplier portal: </span><a className="underline break-all" href={String(p.supplier_portal_url)} target="_blank" rel="noreferrer">{String(p.supplier_portal_url)} ↗</a></p> : <p className="mt-2"><span className="bx-todo">no supplier portal URL in the pack</span></p>}
            {p.portal_note ? <div className="text-sm mt-1"><Prose md={String(p.portal_note)} /></div> : null}
            <Field label="What registration asks for" value={p.registration_asks} />
            <Field label="Liaison named" value={p.liaison_named} />
            <Field label="Programs the company names" value={p.programs} />
            <Field label="Selection, in the company's words" value={p.selection_statement} />
            <Field label="Forecasts, in the company's words" value={p.forecast_statement} />
            <Field label="Also states" value={p.also_states} />
            <Field label="Could not be read" value={p.unreadable} />
            <OtherFields record={p} shown={SHOWN} />
            <Sources ns={p.sources} />
          </li>
        ))}
      </ul>
    </div>
  );
}
