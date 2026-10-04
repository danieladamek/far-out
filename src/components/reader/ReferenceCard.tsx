import { Link } from 'react-router-dom';
import type { Reference } from '@/types';
import { recordsIndexById } from '@/lib/records';
import { sectionTitle, TIER_NOTE } from '@/lib/data';
import Todo from '@/components/ui/Todo';
import NoteButton from '@/components/notepad/NoteButton';

const ROLE: Record<string, string> = {
  support: 'Supports a claim', method: 'Method source', contrast: 'Contrast / disagreement', 'prior-result': 'Prior result',
  'data-source': 'Data source', background: 'Background',
};
const READ: Record<string, string> = { full: 'read in full', partial: 'read in part', 'not-fetched': 'not fetched' };

const Label = ({ children }: { children: React.ReactNode }) => <span className="block text-[11px] font-semibold tracking-[0.15em] bx-muted">{children}</span>;

/** A key fact the live recheck contradicted or could not find: shown only here, labelled, never as a plain fact. */
export function TaggedFact({ text }: { text: string }) {
  const m = /^\[(CONTRADICTED|unconfirmed)([^\]]*)\]\s*([\s\S]*)$/i.exec(text);
  if (!m) return <>{text}</>;
  const contradicted = /contradicted/i.test(m[1]);
  return (
    <span data-testid={contradicted ? 'fact-contradicted' : 'fact-unconfirmed'}>
      <span className="bx-todo mr-1">{contradicted ? 'contradicted on recheck' : 'not found on recheck'}</span>
      <span className="bx-muted text-xs">[{m[1]}{m[2]}]</span> <span className={contradicted ? 'line-through decoration-1' : ''}>{m[3]}</span>
    </span>
  );
}

/**
 * The reference card used everywhere — reader fold-outs, record pages, /references. Everything on it comes from
 * the pack and renders as written: tier, source kind, how much was read, whether the live recheck happened, the
 * quotes kept and dropped, and any key fact the recheck contradicted or could not find (labelled, never plain).
 */
export default function ReferenceCard({ r, compact = false }: { r: Reference; compact?: boolean }) {
  const tagged = r.key_facts.filter((k) => /^\[(CONTRADICTED|unconfirmed)/i.test(k));
  const plain = r.key_facts.filter((k) => !/^\[(CONTRADICTED|unconfirmed)/i.test(k));
  const prev = Array.isArray(r.prev_n) ? r.prev_n.join(', ') : r.prev_n;
  return (
    <div data-testid={`ref-card-${r.n}`} className="grid gap-2.5 min-w-0 [overflow-wrap:anywhere]">
      <p className="text-sm"><span className="font-semibold">[{r.n}]</span> {r.citation}</p>

      <p className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="bx-tier" title={TIER_NOTE[r.tier]}>{r.tier}</span>
        <span className="bx-chip border border-[color:var(--bx-line)] bx-muted" title={r.source_kind === 'secondary' ? 'Law firm, consultant or trade press: never carries a fact alone in this guide' : 'An official source'}>{r.source_kind}</span>
        <span className="bx-chip bg-paper-2 dark:bg-night-2">{READ[r.read] ?? r.read}</span>
        <span className="bx-chip bg-paper-2 dark:bg-night-2">{r.year}</span>
        <span className="bx-chip bg-paper-2 dark:bg-night-2">{ROLE[r.role_here] ?? r.role_here}</span>
        {r.rechecked && !r.recheck
          ? <span className="bx-chip border border-[color:var(--bx-line)]" data-testid="rechecked">rechecked {r.rechecked}</span>
          : <span className="bx-todo" data-testid="not-rechecked">not rechecked</span>}
        {!r.verified && <span className="bx-todo">not verified — summary from metadata only</span>}
      </p>
      <p className="text-xs bx-muted">
        {r.publisher} · published {r.published}{r.page_date ? ` · page dated ${r.page_date}` : ''} · accessed {r.accessed}
        {' · '}<a className="underline" href={r.final_url ?? r.url} target="_blank" rel="noreferrer">open the source ↗</a>
      </p>
      {r.date_note && !compact && <p className="text-xs bx-muted">Date note: {r.date_note}</p>}
      {r.tier_note && !compact && <p className="text-xs bx-muted">Tier note: {r.tier_note}</p>}

      <div className="text-sm">
        <Label>WHAT THE SOURCE SAYS</Label>
        {r.summary.trim()
          ? <p className={`mt-1 ${compact ? 'leading-6' : 'bx-prose'}`}>{r.summary}</p>
          : <p className="mt-1"><Todo>summary pending — not in the content pack</Todo></p>}
      </div>
      {r.why_it_mattered && <p className="text-sm"><span className="font-semibold">Why it matters: </span>{r.why_it_mattered}</p>}
      {r.role_note && <p className="text-sm"><span className="font-semibold">Role here: </span>{r.role_note}</p>}
      {r.recheck_note && <p className="text-sm border-l-2 border-[color:var(--bx-line)] pl-3" data-testid="recheck-note"><span className="font-semibold">Recheck note: </span>{r.recheck_note}</p>}

      {tagged.length > 0 && (
        <div className="text-sm border-l-2 border-amber-500 pl-3" data-testid="tagged-facts">
          <Label>WHERE THE LIVE PAGE DIFFERED</Label>
          <ul className="mt-1 grid gap-1">{tagged.map((k, i) => <li key={i}><TaggedFact text={k} /></li>)}</ul>
        </div>
      )}
      {r.quotes.length > 0 && (
        <details className="text-sm" open={!compact && r.quotes.length <= 2}>
          <summary className="cursor-pointer bx-muted">{r.quotes.length} quotation{r.quotes.length === 1 ? '' : 's'} kept (≤ 25 words, as on the page)</summary>
          <ul className="mt-1 grid gap-1">{r.quotes.map((q, i) => <li key={i} className="border-l-2 border-[color:var(--bx-line)] pl-2">“{q.replace(/^["“]|["”]$/g, '')}”</li>)}</ul>
        </details>
      )}
      {r.dropped_quotes.length > 0 && (
        <details className="text-sm" data-testid="dropped-quotes">
          <summary className="cursor-pointer bx-muted">{r.dropped_quotes.length} quotation{r.dropped_quotes.length === 1 ? '' : 's'} dropped on recheck (not verbatim on the live page)</summary>
          <ul className="mt-1 grid gap-1">{r.dropped_quotes.map((q, i) => <li key={i} className="bx-muted"><span className="line-through decoration-1">{q.quote}</span>{q.verdict && <span className="ml-1 bx-chip border border-[color:var(--bx-line)]">{q.verdict.toLowerCase()}</span>}</li>)}</ul>
        </details>
      )}
      {!compact && plain.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer bx-muted">{plain.length} key fact{plain.length === 1 ? '' : 's'} as the page gives them</summary>
          <ul className="mt-1 list-disc pl-5 grid gap-1">{plain.map((k, i) => <li key={i}>{k}</li>)}</ul>
        </details>
      )}

      <p className="text-xs bx-muted">
        {r.cited_sections.length > 0 && <>Cited in the guide: {r.cited_sections.map((s) => <Link key={s} className="underline mr-2" to={`/read#${s}`}>{sectionTitle(s)}</Link>)}</>}
        {r.cited_records.length > 0 && <>{r.cited_sections.length > 0 && ' · '}Cited by {r.cited_records.length} record{r.cited_records.length === 1 ? '' : 's'}: {r.cited_records.slice(0, compact ? 4 : 30).map((k) => { const m = recordsIndexById.get(k); return m ? <Link key={k} className="underline mr-2" to={m.to}>{m.title.slice(0, 60)}</Link> : <span key={k} className="mr-2">{k}</span>; })}{r.cited_records.length > (compact ? 4 : 30) && '…'}</>}
        {r.cited_sections.length === 0 && r.cited_records.length === 0 && r.cited_elsewhere.length === 0 && <>Cited nowhere in this build.</>}
        {prev !== undefined && <span className="ml-1 opacity-70"> · sweep no. {prev}</span>}
      </p>

      <div className="flex flex-wrap items-center gap-2 no-print">
        <NoteButton anchor={{ type: 'ref', id: String(r.n) }} label={`reference ${r.n}`} />
        {compact && <Link className="underline text-xs font-semibold" to={`/references#ref-${r.n}`}>Open in references →</Link>}
      </div>
    </div>
  );
}
