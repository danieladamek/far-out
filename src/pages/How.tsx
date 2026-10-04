import { loadMechanics, useAsync } from '@/lib/heavy';
import FieldView from '@/components/records/FieldView';
import CiteList from '@/components/records/CiteList';
import { AsOf, BlockLabel, Conflicts, OfficialLink, PendingChanges, RecordHeader, Sources } from '@/components/records/Bits';
import { Field, OtherFields } from '@/components/records/RecordSections';
import { humanise } from '@/components/records/FieldView';

interface CodeTable { cite?: number[]; codes?: unknown[]; retired?: unknown[]; glosses_as_given_in_sweep?: unknown[]; notes?: string[]; [k: string]: unknown }

/** Notice-type and set-aside code lists as tables, as the pack records them. */
function Codes({ label, t }: { label: string; t: CodeTable }) {
  const codes = (t.codes ?? []) as unknown[];
  return (
    <section aria-label={label} data-testid={`codes-${label}`}>
      <BlockLabel>{label}</BlockLabel>
      {codes.length > 0 && (typeof codes[0] === 'object'
        ? <FieldView value={codes} name="codes" />
        : <div className="overflow-x-auto"><table className="bx-table"><thead><tr><th scope="col">Code</th></tr></thead><tbody>{codes.map((c, i) => <tr key={i}><td className="font-mono">{String(c)}</td></tr>)}</tbody></table></div>)}
      {t.retired?.length ? <><p className="text-xs font-semibold bx-muted mt-2">Retired</p><FieldView value={t.retired} name="retired" /></> : null}
      {t.glosses_as_given_in_sweep?.length ? <><p className="text-xs font-semibold bx-muted mt-2">Glosses as given in the sweep</p><FieldView value={t.glosses_as_given_in_sweep} /></> : null}
      {t.notes?.length ? <><p className="text-xs font-semibold bx-muted mt-2">Notes</p><FieldView value={t.notes} /></> : null}
      {Object.entries(t).filter(([k]) => !['cite', 'codes', 'retired', 'glosses_as_given_in_sweep', 'notes'].includes(k)).map(([k, v]) => <div key={k}><p className="text-xs font-semibold bx-muted mt-2">{humanise(k)}</p><FieldView value={v} name={k} /></div>)}
      {t.cite && <div className="mt-1"><CiteList ns={t.cite} /></div>}
    </section>
  );
}

/** `/how` — the mechanics records as short pages: reading SAM.gov, market research, responding, payment, OTs in public data. */
export default function How() {
  const mech = useAsync(loadMechanics);
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl sm:text-4xl">How it works</h1>
      <p className="bx-prose mt-2">The mechanics of the work: reading a SAM.gov notice, market research from the firm's side, responding to a sources-sought notice, the capability statement, payment, and what public data shows about Other Transactions.</p>
      <nav aria-label="How-it-works pages" className="mt-4 flex flex-wrap gap-1.5 text-sm">{(mech ?? []).map((m) => <a key={m.id} href={`#${m.id}`} className="bx-chip border border-[color:var(--bx-line)] hover:underline">{String(m.name)}</a>)}</nav>
      {!mech && <p className="bx-muted" role="status">Loading…</p>}
      <div className="grid gap-10 mt-6">
        {(mech ?? []).map((m) => (
          <article key={m.id} id={m.id} className="scroll-mt-28 border-t border-[color:var(--bx-line)] pt-6" data-testid={`how-${m.id}`}>
            <RecordHeader title={String(m.name)} anchor={{ type: 'mechanics', id: m.id }} level={2}><AsOf date={m.as_of} /></RecordHeader>
            <Field label="What it is" value={m.what} />
            {m.notice_types ? <Codes label="Notice types" t={m.notice_types as CodeTable} /> : null}
            {m.set_aside_codes ? <Codes label="Set-aside codes" t={m.set_aside_codes as CodeTable} /> : null}
            <OtherFields record={m} shown={new Set(['id', 'name', 'what', 'notice_types', 'set_aside_codes', 'official_url', 'pending_changes', 'as_of', 'sources', 'conflicts', 'changes'])} />
            <PendingChanges items={m.pending_changes} />
            <Conflicts items={m.conflicts} />
            <div className="mt-4"><OfficialLink url={m.official_url} /></div>
            <Sources ns={m.sources} />
          </article>
        ))}
      </div>
    </div>
  );
}
