import { loadCertifications, useAsync } from '@/lib/heavy';
import type { RecordBase } from '@/types';
import Prose from '@/components/records/Prose';
import { AsOf, BlockLabel, Conflicts, OfficialLink, PendingChanges, RecordHeader, Sources } from '@/components/records/Bits';
import { Field, OtherFields } from '@/components/records/RecordSections';
import ReaderFigure from '@/components/reader/ReaderFigure';

const SHOWN = new Set(['id', 'name', 'owner', 'what', 'eligibility', 'benefits', 'steps', 'cost_and_time', 'recertification', 'official_url', 'pending_changes', 'situations', 'as_of', 'sources', 'conflicts', 'changes']);

/**
 * A `conflicts` line that sets the FAR against 13 CFR ("FAR 19.805-1 $8.5 million [338] vs 13 CFR 124.506 $7,000,000
 * [331]") is laid out side by side: the words are the pack's, split at its own " vs ".
 */
function splitFarCfr(line: string): { topic: string; left: string; right: string } | null {
  if (!/\bFAR\b/.test(line) || !/\bCFR\b/.test(line)) return null;
  const parts = line.split(/\s+vs\.?\s+/);
  if (parts.length !== 2) return null;
  const m = /^([^:]{3,80}):\s+([\s\S]*)$/.exec(parts[0]);
  return { topic: m ? m[1] : '', left: m ? m[2] : parts[0], right: parts[1] };
}

function FarVsCfr({ conflicts }: { conflicts: string[] }) {
  const rows = conflicts.map(splitFarCfr).filter((x): x is NonNullable<ReturnType<typeof splitFarCfr>> => !!x);
  if (!rows.length) return null;
  return (
    <section aria-label="FAR and 13 CFR side by side" data-testid="far-vs-cfr">
      <BlockLabel>Where the FAR and 13 CFR give different figures</BlockLabel>
      <div className="overflow-x-auto"><table className="bx-table">
        <thead><tr><th scope="col">Point</th><th scope="col">One text says</th><th scope="col">The other says</th></tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i}><td className="font-semibold">{r.topic}</td><td><Prose md={r.left} /></td><td><Prose md={r.right} /></td></tr>)}</tbody>
      </table></div>
      <p className="text-xs bx-muted mt-1">Both figures are shown with their citations; neither is picked. The full lines are under “Where official sources differ”.</p>
    </section>
  );
}

/** `/status` — certifications and size records (KICKOFF §4b), with fig5 on the page. */
export default function Status() {
  const certs = useAsync(loadCertifications);
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl sm:text-4xl">Status: certifications and size</h1>
      <p className="bx-prose mt-2">The socio-economic certifications, the size standards and affiliation rules, and the nontraditional defense contractor status. Each record gives eligibility, benefits, steps, cost and time, recertification, pending changes and sources; where the FAR and SBA's regulation at 13 CFR print different figures, both are shown side by side.</p>
      <nav aria-label="Status records" className="mt-4 flex flex-wrap gap-1.5 text-sm">{(certs ?? []).map((c) => <a key={c.id} href={`#${c.id}`} className="bx-chip border border-[color:var(--bx-line)] hover:underline">{c.name}</a>)}</nav>
      <ReaderFigure id="goals-vs-results" />
      {!certs && <p className="bx-muted" role="status">Loading…</p>}
      <div className="grid gap-10 mt-6">
        {(certs ?? []).map((c: RecordBase) => (
          <article key={c.id} id={c.id} className="scroll-mt-28 border-t border-[color:var(--bx-line)] pt-6" data-testid={`cert-${c.id}`}>
            <RecordHeader title={String(c.name)} anchor={{ type: 'certifications', id: c.id }} level={2}><AsOf date={c.as_of} />{c.owner ? <span className="bx-muted">{String(c.owner)}</span> : null}</RecordHeader>
            <div className="mt-3"><Prose md={String(c.what ?? '')} /></div>
            <Field label="Eligibility" value={c.eligibility} />
            <Field label="Benefits (sole-source and set-aside thresholds, price preference)" value={c.benefits} />
            <FarVsCfr conflicts={c.conflicts} />
            <Field label="Steps" value={c.steps} />
            <Field label="Cost and time" value={c.cost_and_time} />
            <Field label="Recertification" value={c.recertification} />
            <PendingChanges items={c.pending_changes} />
            <Conflicts items={c.conflicts} />
            <OtherFields record={c} shown={SHOWN} />
            <div className="mt-4"><OfficialLink url={c.official_url} /></div>
            <Sources ns={c.sources} />
          </article>
        ))}
      </div>
    </div>
  );
}
