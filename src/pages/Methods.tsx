import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import buildErrorsJson from '@/data/build-errors.json';
import synthesisJson from '@/data/synthesis.json';
import queriesJson from '@/data/queries.json';
import type { BuildError, SynthesisPassage, TodoItem } from '@/types';
import { AS_OF, asOfLong, assetUrl, getTerm, manifest, provenance, sectionTitle } from '@/lib/data';
import { loadScope, loadTodo, useAsync } from '@/lib/heavy';

const buildErrors = buildErrorsJson as BuildError[];
const synthesis = synthesisJson as SynthesisPassage[];
const queries = queriesJson as { text: string; engine: string; hits: number; date: string; slice: string; note?: string }[];

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="bx-card p-3"><p className="text-[11px] font-semibold tracking-[0.15em] bx-muted">{label}</p><p className="text-lg font-display mt-0.5">{value}</p></div>;
}
function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return <h2 id={id} className="text-2xl mt-10 text-ink dark:text-night-ink scroll-mt-24">{children}</h2>;
}
const list = (o: Record<string, number> | undefined | null) => Object.entries(o ?? {}).map(([k, v]) => `${k} ${v.toLocaleString()}`).join(' · ');
const TODO_KIND: Record<string, string> = { gap: 'Gaps', conflict: 'Conflicts between sources', unverified: 'Unverified', recheck: 'Awaiting recheck' };

/** `/methods` — the app's honesty (APP-SPEC §2, topic mode): provenance, scope, interview, every query, corpus, gaps. */
export default function Methods() {
  const scope = useAsync(loadScope);
  const todo = useAsync(loadTodo);
  const [qf, setQf] = useState('');
  const [slice, setSlice] = useState('');
  const P = provenance;
  const slices = useMemo(() => [...new Set(queries.map((q) => q.slice))].sort(), []);
  const bySlice = useMemo(() => slices.map((s) => { const qs = queries.filter((q) => q.slice === s); return { s, n: qs.length, hits: qs.reduce((a, q) => a + q.hits, 0), zero: qs.filter((q) => q.hits === 0).length }; }), [slices]);
  const shownQ = useMemo(() => { const n = qf.trim().toLowerCase(); return queries.filter((q) => (!slice || q.slice === slice) && (!n || `${q.text} ${q.engine}`.toLowerCase().includes(n))); }, [qf, slice]);
  const todoByKind = useMemo(() => (todo ?? []).reduce<Record<string, TodoItem[]>>((a, t) => { (a[t.kind] ??= []).push(t); return a; }, {}), [todo]);
  const cell = 'border-b border-[color:var(--bx-line)] px-2 py-1 align-top';

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 bx-prose text-ink dark:text-night-ink">
      <h1 className="text-3xl sm:text-4xl text-ink dark:text-night-ink">Methods &amp; provenance</h1>
      <p className="mt-2 flex flex-wrap items-center gap-2">
        <span className="bx-chip border border-[color:var(--bx-line)] bx-muted">COMMISSIONED GUIDE — NOT PEER REVIEWED · NOT ADVICE</span>
        <span className="bx-asof">Sweep closed {AS_OF}</span>
      </p>
      <p className="mt-3 text-[17px] leading-8 font-semibold">This is a scope-bounded commissioned review, not a systematic review.</p>
      <p className="mt-2">
        FAR Out was written by an AI research builder ({manifest.builder.name} v{manifest.builder.version}, {manifest.builder.date}) from a scoped sweep of public government sources,
        and this app was built from that content pack by Claude Code. Nothing here is official, peer reviewed or advice. What it offers instead is traceability: every claim carries a
        citation to a source whose read level and recheck state are shown, every inference is marked as one, and the scope, the interview and every search query are published below.
        The sweep closed on {asOfLong()}; federal contracting rules change often, and every record shows its own as-of date.
      </p>
      <nav aria-label="On this page" className="mt-3 text-sm flex flex-wrap gap-x-3 gap-y-1">
        {[['counts', 'Provenance counts'], ['errors', 'Build errors'], ['todo', 'TODO(author)'], ['synthesis', 'Synthesis passages'], ['scope', 'Scope'], ['interview', 'Interview'], ['queries', 'Every query'], ['corpus', 'Corpus profile'], ['recheck', 'Recheck'], ['gaps', 'Unread primaries'], ['voice', 'Pack voice'], ['terms', 'Term linking'], ['build', 'How the app was built']].map(([id, l]) => <a key={id} className="underline" href={`#${id}`}>{l}</a>)}
      </nav>

      <H2 id="counts">Provenance counts</H2>
      <div className="mt-3 grid gap-2 sm:grid-cols-3" data-testid="provenance-counts">
        <Stat label="GUIDE" value={`${P.words.toLocaleString()} words · ${P.sections} sections`} />
        <Stat label="BLOCKS (CITED / FRAMING / SYNTHESIS)" value={`${P.blocks.total} (${P.blocks.cited} / ${P.blocks.framing} / ${P.blocks.synthesis})`} />
        <Stat label="UNCITED BLOCKS" value={<span data-testid="uncited-count">{P.blocks.uncited} in the guide · {P.concept_uncited} in 101s · {P.record_prose.uncited} in records</span>} />
        <Stat label="GLOSSARY TERMS LINKED" value={`${P.terms.linked} of ${P.terms.occurring} occurring (${P.terms.linked_pct_of_occurring}%)`} />
        <Stat label="TERMS REACHABLE" value={`${P.terms.reachable_anywhere} of ${P.terms.total} (guide, records or 101s)`} />
        <Stat label="REFERENCES" value={`${P.references.total.toLocaleString()} · ${list(P.references.by_tier)}`} />
        <Stat label="SOURCE KIND" value={list(P.references.by_source_kind)} />
        <Stat label="READ" value={list(P.references.by_read)} />
        <Stat label="CITED / NEVER CITED" value={`${P.references.cited.toLocaleString()} / ${P.references.never_cited}`} />
        <Stat label="RECHECKED / PENDING" value={`${P.references.rechecked.toLocaleString()} / ${P.references.recheck_pending}`} />
        <Stat label="KEY FACTS CONTRADICTED / UNCONFIRMED" value={`${P.references.key_facts_contradicted} / ${P.references.key_facts_unconfirmed} of ${P.references.key_facts.toLocaleString()}`} />
        <Stat label="QUOTES KEPT / DROPPED" value={`${P.references.quotes.toLocaleString()} / ${P.references.dropped_quotes}`} />
        <Stat label="FIGURES" value={`${P.figures.total} (${list(P.figures.by_synthesis)})`} />
        <Stat label="RECORD PROSE ITEMS (CITED)" value={`${P.record_prose.items.toLocaleString()} (${P.record_prose.cited.toLocaleString()})`} />
        <Stat label="TODO(AUTHOR)" value={`${P.todo.count} · ${list(P.todo.by_kind)}`} />
      </div>
      <p className="mt-3 text-sm"><span className="font-semibold">Records by file: </span>{list(P.records)}. Programs by kind: {list(P.records_detail.programs_by_kind)}. Changes by status: {list(P.records_detail.changes_by_status)}; by basis: {list(P.records_detail.changes_by_basis)}.</p>
      <p className="mt-1 text-sm">The full record is <a className="underline" href={assetUrl('provenance.json')}>provenance.json</a>. {P.references.unverified_but_cited.length > 0 && <span className="bx-todo">{P.references.unverified_but_cited.length} cited references are verified: false — {P.references.unverified_but_cited.map((n) => `[${n}]`).join(' ')}</span>}</p>

      <H2 id="errors">Build errors ({buildErrors.length})</H2>
      {buildErrors.length === 0 ? <p className="mt-2">The content build found no errors.</p> : (
        <>
          <p className="mt-2">The content build checks every id and every citation in the pack and fails loudly. These are errors in the pack, recorded rather than repaired — an unknown id is never re-pointed at a similar one. The app was built from everything else; the affected links show the unknown id in amber.</p>
          <ul className="mt-2 grid gap-1 text-sm" data-testid="build-errors">{buildErrors.map((e, i) => <li key={i}><span className="bx-todo mr-1">error</span><code className="font-mono text-xs">{e.where}</code> — {e.message}</li>)}</ul>
        </>
      )}

      <H2 id="todo">TODO(author) — known gaps ({P.todo.count})</H2>
      <p className="mt-2">Every gap, unverified page, conflict and pending recheck the sweep recorded, by kind. They are shown, never filled.</p>
      {!todo && <p className="bx-muted" role="status">Loading…</p>}
      {Object.entries(todoByKind).map(([k, items]) => (
        <details key={k} className="mt-2 text-sm" data-testid={`todo-${k}`}>
          <summary className="cursor-pointer"><span className="bx-todo">{TODO_KIND[k] ?? k}: {items.length}</span></summary>
          <ul className="mt-2 grid gap-1.5">{items.map((t) => <li key={t.id}><code className="font-mono text-xs">{t.id}</code> <span className="bx-muted">({t.where})</span> — {t.what}</li>)}</ul>
        </details>
      ))}

      <H2 id="synthesis">Every synthesis passage ({synthesis.length})</H2>
      <p className="mt-2">A <em>synthesis</em> passage states a conclusion the cited sources do not individually state. Each is marked in the guide with a quiet left rule and the word synthesis. Here is every one, linked.</p>
      <ol className="mt-3 grid gap-2 text-sm" data-testid="synthesis-list">
        {synthesis.map((s) => <li key={s.id}><Link className="underline font-semibold" to={`/read#${s.id}`}>{sectionTitle(s.section)}</Link> — {s.excerpt}{s.excerpt.length >= 220 ? '…' : ''}</li>)}
      </ol>

      {scope && (
        <>
          <H2 id="scope">Scope</H2>
          <p className="mt-2"><span className="font-semibold">Topic: </span>{scope.topic}</p>
          <p className="mt-1"><span className="font-semibold">Question: </span>{scope.question}</p>
          <p className="mt-1 text-sm">Purpose {scope.purpose} · level {scope.level} · stance {scope.stance} · depth {scope.depth} · current from {scope.time_window.current_from}{scope.time_window.seminal ? `; seminal: ${scope.time_window.seminal}` : ''}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 text-sm">
            <div className="bx-card p-3"><p className="font-semibold">In</p><ul className="list-disc pl-5 mt-1 grid gap-1">{scope.boundary.in.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
            <div className="bx-card p-3"><p className="font-semibold">Out</p><ul className="list-disc pl-5 mt-1 grid gap-1">{scope.boundary.out.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
          </div>
          {scope.boundary.rationale && <p className="mt-2 text-sm"><span className="font-semibold">Why: </span>{scope.boundary.rationale}</p>}
          {scope.excluded.length > 0 && <><p className="mt-3 font-semibold text-sm">Left out on purpose</p><ul className="list-disc pl-5 text-sm grid gap-1">{scope.excluded.map((x, i) => <li key={i}>{x.what} — {x.why}</li>)}</ul></>}
          {scope.anchors.length > 0 && <><p className="mt-3 font-semibold text-sm">Anchors named in the interview</p><ul className="list-disc pl-5 text-sm grid gap-1">{scope.anchors.map((x, i) => <li key={i}>{x.citation} — {x.why}</li>)}</ul></>}

          <H2 id="interview">The interview, as asked and answered ({scope.interview.length})</H2>
          {scope.assumed && <p className="mt-2"><span className="bx-todo">Some answers were assumed</span></p>}
          <dl className="mt-3 grid gap-3 text-sm">{scope.interview.map((x, i) => <div key={i} className="bx-card p-3"><dt className="font-semibold">{x.q}</dt><dd className="mt-1">“{x.answer}”{x.asked ? <span className="bx-muted"> ({x.asked})</span> : null}</dd></div>)}</dl>
        </>
      )}

      <H2 id="queries">Every query ({queries.length})</H2>
      <p className="mt-2">Every search the sweep ran, with the number of links each returned — including the ones that found nothing ({P.queries.zero_hit}). Total links returned: {P.queries.hits.toLocaleString()}. {scope && <>Run on {scope.search_strategy.run_on}; sources {scope.search_strategy.sources.join(', ')}.</>}</p>
      {scope && (
        <div className="mt-2 grid gap-2 sm:grid-cols-3 text-sm">
          <div className="bx-card p-3"><p className="font-semibold">Snowball</p><ul className="list-disc pl-5">{scope.search_strategy.snowball.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
          <div className="bx-card p-3"><p className="font-semibold">Inclusion</p><ul className="list-disc pl-5">{scope.search_strategy.inclusion.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
          <div className="bx-card p-3"><p className="font-semibold">Exclusion</p><ul className="list-disc pl-5">{scope.search_strategy.exclusion.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
        </div>
      )}
      <div className="overflow-x-auto mt-3"><table className="w-full text-sm" data-testid="queries-by-slice">
        <caption className="text-left text-xs bx-muted">Hits by slice</caption>
        <thead><tr><th className={`${cell} text-left`}>Slice</th><th className={`${cell} text-right`}>Queries</th><th className={`${cell} text-right`}>Links returned</th><th className={`${cell} text-right`}>Zero-hit</th></tr></thead>
        <tbody>{bySlice.map((r) => <tr key={r.s}><td className={cell}><button type="button" className="underline" onClick={() => setSlice(r.s)}>{r.s}</button></td><td className={`${cell} text-right tabular-nums`}>{r.n}</td><td className={`${cell} text-right tabular-nums`}>{r.hits.toLocaleString()}</td><td className={`${cell} text-right tabular-nums`}>{r.zero}</td></tr>)}</tbody>
      </table></div>
      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        <label className="sr-only" htmlFor="qf">Filter queries</label>
        <input id="qf" className="bx-input max-w-xs" placeholder="Filter queries…" value={qf} onChange={(e) => setQf(e.target.value)} />
        <select className="bx-input max-w-[12rem]" value={slice} onChange={(e) => setSlice(e.target.value)} aria-label="Slice"><option value="">All slices</option>{slices.map((s) => <option key={s} value={s}>{s}</option>)}</select>
        <span className="bx-muted self-center" role="status">{shownQ.length} shown</span>
      </div>
      <div className="overflow-x-auto mt-2 max-h-[36rem] overflow-y-auto"><table className="w-full text-xs" data-testid="queries-table">
        <thead className="sticky top-0 bg-paper dark:bg-night"><tr><th className={`${cell} text-left`}>#</th><th className={`${cell} text-left`}>Query</th><th className={`${cell} text-left`}>Slice</th><th className={`${cell} text-left`}>Engine</th><th className={`${cell} text-right`}>Hits</th><th className={`${cell} text-left`}>Date</th></tr></thead>
        <tbody>{shownQ.map((q) => <tr key={queries.indexOf(q)}><td className={`${cell} tabular-nums`}>{queries.indexOf(q) + 1}</td><td className={cell}>{q.text}{q.note && <span className="block bx-muted">{q.note}</span>}</td><td className={cell}>{q.slice}</td><td className={cell}>{q.engine}</td><td className={`${cell} text-right tabular-nums`}>{q.hits}</td><td className={cell}>{q.date}</td></tr>)}</tbody>
      </table></div>

      {scope && (
        <>
          <H2 id="corpus">Corpus profile</H2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 text-sm">
            <Stat label="BY TIER (AS THE SWEEP PROFILED IT)" value={list(scope.corpus_profile.by_tier)} />
            <Stat label="BY TIER (IN references.yaml)" value={list(P.references.by_tier)} />
            <Stat label="BY SOURCE KIND" value={list(scope.corpus_profile.by_source_kind as Record<string, number> | undefined)} />
            <Stat label="YEAR RANGE" value={(scope.corpus_profile.year_range ?? []).join('–')} />
          </div>
          <p className="mt-2 text-sm">The two tier counts differ because the pack remapped tiers for the validator: twelve governing texts are seminal, and other statutes, regulations and reports are background, each keeping its sweep tier in <code className="font-mono text-xs">tier_note</code> (content pack README).</p>
          <p className="mt-2 text-sm"><span className="font-semibold">Concentration: </span>{scope.corpus_profile.concentration}</p>
          <p className="mt-1 text-sm"><span className="font-semibold">Dissent represented: </span>{scope.corpus_profile.dissent_represented ? 'yes' : 'no'}. {scope.corpus_profile.dissent_note}</p>

          <H2 id="recheck">Recheck summary</H2>
          <p className="mt-2 text-sm">{scope.corpus_profile.recheck}</p>
          <p className="mt-1 text-sm">In this build: {P.references.rechecked.toLocaleString()} references carry a recheck date; {P.references.recheck_pending} are still flagged for recheck, {P.references.recheck_pending_cited.length} of them cited ({P.references.recheck_pending_cited.map((n) => `[${n}]`).join(' ')}). Each reference card says “rechecked” with its date or “not rechecked”.</p>

          <H2 id="gaps">Primaries not read ({scope.search_strategy.known_gaps.length})</H2>
          <ul className="list-disc pl-5 mt-2 text-sm grid gap-1" data-testid="known-gaps">{scope.search_strategy.known_gaps.map((g, i) => <li key={i}>{g}</li>)}</ul>
        </>
      )}

      <H2 id="voice">Pack voice ({P.voice.count})</H2>
      <p className="mt-2 text-sm">The guide does not tell a reader what to do about their own business. Pack text that addresses the reader in the second person is a pack error; it is rendered as written and listed here for the author.</p>
      <ul className="mt-2 grid gap-1 text-sm" data-testid="voice-list">{P.voice.items.map((v, i) => <li key={i}><code className="font-mono text-xs">{v.where}</code> — “{v.excerpt}”</li>)}</ul>

      <H2 id="terms">Term linking</H2>
      <p className="mt-2 text-sm">
        Glossary terms are matched whole-word and case-insensitively, longest match first (so “Phase II requirements” is never linked as “Phase II”, nor “SAM.gov” as “SAM”); a variant written in capitals matches only in capitals.
        The first occurrence in each guide section, 101 and record is linked. {P.terms.linked} of the {P.terms.occurring} terms that occur in the guide text are linked ({P.terms.linked_pct_of_occurring}%);
        {' '}{P.terms.linked_in_records} terms are linked from records. Terms that occur in the guide but are never linked because every occurrence sits inside a longer term:{' '}
        {P.terms.occurring_not_linked.map((t) => getTerm(t)?.term ?? t).join(', ') || 'none'}. Terms that do not occur in the guide text ({P.terms.unmatched.length}): {P.terms.unmatched.map((t) => getTerm(t)?.term ?? t).join(', ')}.
      </p>

      <H2 id="build">How the app was built</H2>
      <ul className="list-disc pl-5 mt-2 text-sm grid gap-1">
        <li><strong>Written by the guide's builder</strong> ({manifest.builder.name} v{manifest.builder.version}): the guide, every record, the glossary, the 101s, the figures and their data, the reference summaries, the pathfinder questions and its ranking rule. It is the only source of content in this app.</li>
        <li><strong>Done by this build</strong>: parsing and validation, the citation-coverage gate on the guide, the 101s and every record's prose, term linking, citation fold-outs, the pathfinder ranking exactly as the rule states it, the gate grouping (derived from each gate's own fields), the figure components, the notepad port, the opportunity search over the daily harvest, the USAspending page, and this record.</li>
        <li><strong>The opportunity data</strong> on /find is harvested daily from the public SAM.gov extract and the Grants.gov search API when the site is deployed; it is never committed. /partners queries USAspending live from the browser.</li>
        <li>No analytics, no accounts, no server. Pathfinder answers, notes and saved searches live in this browser's localStorage only.</li>
      </ul>
    </div>
  );
}
