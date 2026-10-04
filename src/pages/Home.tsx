import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import pathfinderJson from '@/data/pathfinder.json';
import homeJson from '@/data/home.json';
import { AS_OF, asOfLong, conceptsIndex, familyColour, FAMILIES, FAMILY_LABEL, manifest, provenance, SLUG, STATUS_WORD } from '@/lib/data';
import { groupByFamily, hasAnyAnswer, rankRoutes, type Answers, type Pathfinder } from '@/lib/pathfinder';
// markdown (and the citation machinery) stays out of the entry chunk; the strip fills in when it arrives
const Prose = lazy(() => import('@/components/records/Prose'));

const pf = pathfinderJson as unknown as Pathfinder;
const home = homeJson as unknown as {
  routes: Record<string, { name: string; family: string; governing_text: string }>;
  always: Record<string, { type: string; name: string; to: string } | null>;
  changes: { id: string; date: string; status: string; basis: string; what: string }[];
  route_counts: Record<string, number>;
};
export const ANSWERS_KEY = `${SLUG}:pathfinder-answers`;

function loadAnswers(): Answers {
  try { const raw = localStorage.getItem(ANSWERS_KEY); return raw ? (JSON.parse(raw) as Answers) : {}; } catch { return {}; }
}

const optionKey = (o: { tag?: string; value?: string | boolean | null }) => (o.tag !== undefined ? o.tag : o.value ?? null);
const keyStr = (v: unknown) => JSON.stringify(v);

/**
 * `/` — the pathfinder (KICKOFF §4b). The pack's questions as a short form; answers live in localStorage only; the
 * routes are ranked by `pathfinder.rule` exactly as written and shown with why each matched. No other score, and
 * nothing is labelled best or recommended.
 */
export default function Home() {
  const [answers, setAnswers] = useState<Answers>(loadAnswers);
  useEffect(() => {
    try {
      if (hasAnyAnswer(answers)) localStorage.setItem(ANSWERS_KEY, JSON.stringify(answers));
      else localStorage.removeItem(ANSWERS_KEY);
    } catch { /* storage blocked: answers live for this visit only */ }
  }, [answers]);
  const ranked = useMemo(() => rankRoutes(pf, answers), [answers]);
  const groups = useMemo(() => groupByFamily(ranked, pf.families), [ranked]);
  const any = hasAnyAnswer(answers);

  const setSingle = (qid: string, v: string | boolean | null) => setAnswers((a) => ({ ...a, [qid]: v }));
  const toggleMulti = (qid: string, v: string) => setAnswers((a) => {
    const cur = (Array.isArray(a[qid]) ? (a[qid] as string[]) : []).filter((x) => x !== v);
    const on = !(Array.isArray(a[qid]) && (a[qid] as string[]).includes(v));
    let next = on ? [...cur, v] : cur;
    if (on && v === 'none') next = ['none'];
    else if (on) next = next.filter((x) => x !== 'none');
    return { ...a, [qid]: next };
  });
  const clear = () => { try { localStorage.removeItem(ANSWERS_KEY); } catch { /* ignore */ } setAnswers({}); };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <p className="flex flex-wrap items-center gap-2">
        <span className="bx-chip border border-[color:var(--bx-line)] bx-muted">COMMISSIONED GUIDE — NOT PEER REVIEWED · NOT ADVICE</span>
        <span className="bx-asof" data-testid="home-asof">Current as of {AS_OF}</span>
      </p>
      <h1 className="text-3xl sm:text-5xl leading-tight mt-3">FAR Out</h1>
      <p className="mt-2 text-lg font-display leading-snug">{manifest.title.replace(/^FAR Out:\s*/, '').replace(/^./, (c) => c.toUpperCase())}</p>
      <p className="bx-prose mt-3 max-w-3xl">{manifest.question}</p>

      <section className="bx-card p-4 sm:p-5 mt-6" aria-labelledby="pf-h" data-testid="pathfinder">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="pf-h" className="text-2xl">Where is the firm now?</h2>
          <button type="button" className="bx-btn" onClick={clear} disabled={!any} data-testid="clear-answers">Clear my answers</button>
        </div>
        <p className="text-xs bx-muted mt-1">{pf.note}</p>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          {pf.questions.map((q) => (
            <fieldset key={q.id} className="min-w-0" data-testid={`q-${q.id}`}>
              <legend className="font-semibold text-sm">{q.prompt}{q.type === 'multi' && <span className="bx-muted font-normal"> (any that apply)</span>}</legend>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {q.options.map((o) => {
                  const v = optionKey(o);
                  const a = answers[q.id];
                  const checked = q.type === 'multi' ? Array.isArray(a) && (a as unknown[]).includes(v) : a !== undefined && keyStr(a) === keyStr(v);
                  const id = `opt-${q.id}-${String(v)}`;
                  return (
                    <label key={id} htmlFor={id} className={`bx-btn cursor-pointer !py-1 ${checked ? 'bx-btn-on' : ''}`}>
                      <input
                        id={id} className="sr-only" type={q.type === 'multi' ? 'checkbox' : 'radio'} name={q.id} checked={checked}
                        onChange={() => (q.type === 'multi' ? toggleMulti(q.id, String(v)) : setSingle(q.id, v))}
                        data-testid={`opt-${q.id}-${String(v)}`}
                      />
                      {o.label}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>
      </section>

      <section className="mt-6" aria-labelledby="res-h" aria-live="polite">
        <h2 id="res-h" className="text-2xl">Routes that match the answers</h2>
        <p className="text-sm mt-1 border-l-2 border-[color:var(--bx-line)] pl-3" data-testid="pf-rule">
          <span className="font-semibold">How the list is ordered, in the guide's words: </span>“{pf.rule}.” The numbers below are that count, nothing more.
          {' '}<Link className="underline" to="/figures/route-decision">Figure 6 draws the same logic as a picture →</Link>
        </p>
        {pf.always_show.map((id) => {
          const a = home.always[id];
          return a && (
            <p key={id} className="bx-card p-3 mt-3 text-sm" data-testid="always-show">
              <span className="bx-chip border border-[color:var(--bx-line)] bx-muted mr-2">shown for every answer</span>
              <Link className="underline font-semibold" to={a.to}>{a.name}</Link> <span className="bx-muted">({a.type === 'gates' ? 'a gate' : a.type})</span>
            </p>
          );
        })}
        {!any && <p className="mt-3 bx-muted">Answer any question above and the matching routes appear here, grouped by family. Or browse <Link className="underline" to="/routes">all {Object.values(home.route_counts).reduce((a, b) => a + b, 0)} routes</Link>.</p>}
        {any && ranked.length === 0 && <p className="mt-3 bx-muted" data-testid="no-match">No route matches these answers. Every route is listed on <Link className="underline" to="/routes">/routes</Link>.</p>}
        <div className="mt-4 grid gap-5">
          {groups.map((g) => (
            <div key={g.family} data-testid={`pf-family-${g.family}`}>
              <h3 className="text-lg flex items-center gap-2"><span aria-hidden="true" className="inline-block h-3 w-3 rounded-full" style={{ background: familyColour(g.family) }} />{g.label} <span className="bx-muted text-sm font-body">({g.routes.length})</span></h3>
              <ol className="mt-2 grid gap-2">
                {g.routes.map((r) => (
                  <li key={r.id} className="bx-card p-3" data-testid={`pf-route-${r.id}`}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <Link className="font-semibold underline" to={`/routes/${r.id}`}>{home.routes[r.id]?.name ?? r.id}</Link>
                      <span className="bx-chip bg-paper-2 dark:bg-night-2 tabular-nums" title="Matched situation tags count 2, matched modifiers 1">{r.score} {r.score === 1 ? 'match point' : 'match points'}</span>
                    </div>
                    <p className="mt-1 text-sm" data-testid="pf-reason">
                      <span className="bx-muted">Matched: </span>
                      {r.reasons.map((x, i) => <span key={i}>{i > 0 && '; '}“{x.label}” <span className="bx-muted text-xs">({x.question.replace(/\?$/, '').toLowerCase()}, +{x.points})</span></span>)}
                    </p>
                    {home.routes[r.id]?.governing_text && <p className="text-xs bx-muted mt-0.5">Governing text: {home.routes[r.id].governing_text}</p>}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10" aria-labelledby="fam-h">
        <h2 id="fam-h" className="text-2xl">The four families of routes</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {FAMILIES.map((f) => (
            <Link key={f} to={`/routes?family=${f}`} className="bx-card p-4 hover:bg-paper-2 dark:hover:bg-night-2 border-l-4" style={{ borderLeftColor: familyColour(f) }} data-testid={`family-card-${f}`}>
              <span className="font-display text-lg font-semibold">{FAMILY_LABEL[f]}</span>
              <span className="block text-sm bx-muted mt-1">{home.route_counts[f] ?? 0} routes →</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-10" aria-labelledby="chg-h" data-testid="changes-strip">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="chg-h" className="text-2xl">What changed</h2>
          <Link className="underline text-sm" to="/changes">The dated ledger →</Link>
        </div>
        <ul className="mt-3 grid gap-2">
          {home.changes.map((c) => (
            <li key={c.id} className="bx-card p-3 text-sm">
              <p className="flex flex-wrap gap-1.5 text-xs"><span className="bx-chip bg-paper-2 dark:bg-night-2 tabular-nums">{c.date}</span><span className="bx-status">{STATUS_WORD[c.status] ?? c.status}</span>{c.basis && c.basis !== 'primary' && <span className="bx-chip border border-dashed border-[color:var(--bx-line)] bx-muted">{c.basis}</span>}</p>
              <Suspense fallback={<p className="mt-1 bx-muted">…</p>}><Prose md={c.what} className="mt-1" /></Suspense>
              <Link className="underline text-xs" to={`/changes#${c.id}`}>In the ledger →</Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10 grid gap-4 md:grid-cols-[minmax(0,1fr)_18rem]" aria-labelledby="guide-h">
        <div>
          <h2 id="guide-h" className="text-2xl">The guide behind the catalogue</h2>
          <p className="bx-prose mt-2">{manifest.plain_abstract}</p>
          <p className="mt-3 text-sm bx-muted">
            {provenance.words.toLocaleString()} words in {provenance.sections} sections, about {manifest.reading_minutes} minutes of reading across the guide and its records;
            {' '}{provenance.references.total.toLocaleString()} public sources, {provenance.references.rechecked.toLocaleString()} of them rechecked against the live page. Sweep closed {asOfLong()}.
          </p>
          <p className="mt-3 flex flex-wrap gap-2"><Link className="bx-btn-primary" to="/read">Start reading</Link><Link className="bx-btn" to="/find">Search open opportunities</Link><Link className="bx-btn" to="/methods">How this was built</Link></p>
        </div>
        <div>
          <h3 className="text-lg">Concepts to know first</h3>
          <ul className="mt-2 grid gap-1.5 text-sm">{conceptsIndex.map((c) => <li key={c.id}><Link className="underline" to={`/concepts/${c.id}`}>{c.title}</Link></li>)}</ul>
        </div>
      </section>
    </div>
  );
}
