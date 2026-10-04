import { Link } from 'react-router-dom';
import gateGroupsJson from '@/data/gate-groups.json';
import { loadGates, loadRoutes, useAsync } from '@/lib/heavy';
import Prose from '@/components/records/Prose';
import { AsOf, BlockLabel, Conflicts, OfficialLink, PendingChanges, RecordHeader, RecordLinks, Sources } from '@/components/records/Bits';
import { Disclosure, Field, OtherFields } from '@/components/records/RecordSections';
import ReaderFigure from '@/components/reader/ReaderFigure';

const GROUPS = gateGroupsJson as { id: string; label: string; rule: string }[];
const SHOWN = new Set(['id', 'name', 'what', 'governing_text', 'applies_when', 'how_it_works', 'steps', 'cost_time', 'rule', 'suspension', 'official_url', 'pending_changes', 'as_of', 'sources', 'conflicts', 'changes', 'routes', 'programs_requiring', 'group']);

/** `/gates` — checklists grouped by when they apply; the grouping is derived from each gate's own fields at build time. */
export default function Gates() {
  const gates = useAsync(loadGates);
  const routes = useAsync(loadRoutes);
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl sm:text-4xl">Gates</h1>
      <p className="bx-prose mt-2">The registrations, representations, rules and checks that stand in front of the routes. Each gate says what it is, when it applies, the steps, cost and time where the sources state them, pending changes and sources, and which routes require it.</p>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer bx-muted">How the gates are grouped</summary>
        <ul className="mt-2 grid gap-1">{GROUPS.map((g) => <li key={g.id}><span className="font-semibold">{g.label}:</span> {g.rule}.</li>)}</ul>
        <p className="mt-1 bx-muted">The test runs in that order on the gate's own fields when the site is built; the words that placed each gate are shown on it. A gate sits in one group only.</p>
      </details>
      <ReaderFigure id="thresholds-2025" />
      {!gates && <p className="bx-muted" role="status">Loading…</p>}
      {GROUPS.map((grp) => {
        const list = (gates ?? []).filter((g) => g.group?.group === grp.id);
        if (!list.length) return null;
        return (
          <section key={grp.id} className="mt-8" aria-labelledby={`gg-${grp.id}`}>
            <h2 id={`gg-${grp.id}`} className="text-2xl">{grp.label} <span className="bx-muted text-base font-body">({list.length})</span></h2>
            <div className="mt-3 grid gap-2">
              {list.map((g) => (
                <Disclosure key={g.id} id={g.id} summary={<><span className="font-semibold">{g.name}</span><span className="block text-xs bx-muted mt-0.5">{g.routes.length} route{g.routes.length === 1 ? '' : 's'} require it{g.group.because ? ` · grouped by “${g.group.because}”` : ''}</span></>}>
                  <RecordHeader title={g.name} anchor={{ type: 'gates', id: g.id }} level={3}><AsOf date={g.as_of} /></RecordHeader>
                  <BlockLabel>What it is</BlockLabel><Prose md={g.what} />
                  <Field label="Governing text" value={g.governing_text} />
                  <BlockLabel>Applies when</BlockLabel><Prose md={g.applies_when} />
                  {g.rule !== undefined && (
                    <div className="bx-card p-3 mt-4" data-testid="gate-rule"><h4 className="font-display text-lg">The rule</h4><Field label="As codified" value={g.rule} name="rule" /></div>
                  )}
                  {g.suspension !== undefined && (
                    <div className="bx-card p-3 mt-4 border-l-4 border-l-amber-500" data-testid="gate-suspension"><h4 className="font-display text-lg">The suspension</h4><Field label="As announced" value={g.suspension} name="suspension" /></div>
                  )}
                  <Field label="How it works" value={g.how_it_works} />
                  <Field label="Steps" value={g.steps} />
                  <Field label="Cost and time" value={g.cost_time} />
                  <PendingChanges items={g.pending_changes} />
                  <Conflicts items={g.conflicts} />
                  <OtherFields record={g} shown={SHOWN} />
                  <div className="mt-4"><OfficialLink url={g.official_url} /></div>
                  <BlockLabel>Routes that require it ({g.routes.length})</BlockLabel>
                  {g.routes.length ? <p className="flex flex-wrap gap-1.5">{g.routes.map((r) => <Link key={r} className="bx-chip border border-[color:var(--bx-line)] hover:underline" to={`/routes/${r}`}>{routes?.find((x) => x.id === r)?.name ?? r}</Link>)}</p> : <p className="text-sm bx-muted">No route record lists this gate.</p>}
                  {g.programs_requiring.length > 0 && (<><BlockLabel>Programs that list it</BlockLabel><RecordLinks type="programs" ids={g.programs_requiring} /></>)}
                  <Sources ns={g.sources} />
                </Disclosure>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
