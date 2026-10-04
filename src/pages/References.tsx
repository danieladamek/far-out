import { useEffect, useMemo, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import scopeJson from '@/data/scope.json';
import type { Reference, Tier } from '@/types';
import { provenance, scrollToId, TIER_NOTE } from '@/lib/data';
import { referencesIndex } from '@/lib/extras';
import { loadReference } from '@/lib/heavy';
import ReferenceCard from '@/components/reader/ReferenceCard';

const TIER_GROUPS: { id: Tier; title: string; order: 'asc' | 'desc' }[] = [
  { id: 'seminal', title: 'Seminal', order: 'asc' },
  { id: 'classic', title: 'Classic', order: 'asc' },
  { id: 'current', title: 'Current', order: 'desc' },
  { id: 'background', title: 'Background', order: 'desc' },
];
const ORDER_NOTE = { asc: 'Oldest first, so the history reads forward.', desc: 'Newest first.' } as const;

/** The scope's anchors are sites Daniel named; a reference whose URL is on one of those sites is marked. */
const ANCHOR_HOSTS = [...new Set((scopeJson.anchors as { citation: string }[]).flatMap((a) => a.citation.match(/[a-z0-9-]+(\.[a-z0-9-]+)*\.(gov|mil|edu)\b/gi) ?? []).map((h) => h.toLowerCase()))];
const hostOf = (citation: string) => (/(https?:\/\/)([^/\s]+)/.exec(citation)?.[2] ?? '').toLowerCase();
const isAnchor = (citation: string) => { const h = hostOf(citation); return !!h && ANCHOR_HOSTS.some((a) => h === a || h.endsWith(`.${a}`)); };

function Row({ n, open, onToggle }: { n: number; open: boolean; onToggle: () => void }) {
  const r = referencesIndex.find((x) => x.n === n)!;
  const [full, setFull] = useState<Reference | null | undefined>();
  useEffect(() => { if (open && full === undefined) loadReference(n).then(setFull); }, [open, n, full]);
  return (
    <li id={`ref-${n}`} className="scroll-mt-28">
      <button type="button" className="w-full text-left rounded-md px-2 py-1.5 hover:bg-paper-2 dark:hover:bg-night-2 text-sm" aria-expanded={open} onClick={onToggle} data-testid={`ref-row-${n}`}>
        <span className="font-semibold">[{n}]</span> {r.citation}
        <span className="block text-xs bx-muted mt-0.5">
          {r.year} · {r.source_kind} · read {r.read} · {r.rechecked ? 'rechecked' : 'not rechecked'}{!r.verified && ' · not verified'}{!r.cited && ' · cited nowhere in this build'}
          {isAnchor(r.citation) && <span className="bx-chip border border-[color:var(--bx-line)] ml-1.5" title="On a site named in the scope interview">scope anchor</span>}
        </span>
      </button>
      {open && <div className="bx-foldout mx-2">{full ? <ReferenceCard r={full} /> : full === null ? <span className="bx-todo">not in the pack</span> : <span role="status" className="bx-muted">Loading…</span>}</div>}
    </li>
  );
}

/** `/references` — grouped by tier, sorted by year within tier, filterable by tier, source kind, publisher and recheck state. */
export default function References() {
  const loc = useLocation();
  const [params, setParams] = useSearchParams();
  const tier = params.get('tier') ?? '';
  const kind = params.get('kind') ?? '';
  const publisher = params.get('publisher') ?? '';
  const recheck = params.get('recheck') ?? '';
  const q = params.get('q') ?? '';
  const set = (k: string, v: string) => { const p = new URLSearchParams(params); if (v) p.set(k, v); else p.delete(k); setParams(p, { replace: true }); };
  const [open, setOpen] = useState<Set<number>>(() => new Set());
  const [limit, setLimit] = useState(150);
  useEffect(() => {
    if (!loc.hash.startsWith('#ref-')) return;
    const n = Number(loc.hash.replace('#ref-', ''));
    if (Number.isInteger(n)) { setOpen((o) => new Set(o).add(n)); setLimit(5000); }
    scrollToId(loc.hash.slice(1));
  }, [loc.hash]);
  const publishers = useMemo(() => [...new Set(referencesIndex.map((r) => r.publisher))].sort(), []);
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return referencesIndex.filter((r) => (!tier || r.tier === tier) && (!kind || r.source_kind === kind) && (!publisher || r.publisher === publisher) &&
      (!recheck || (recheck === 'yes' ? r.rechecked : !r.rechecked)) && (!needle || `${r.n} ${r.key} ${r.citation}`.toLowerCase().includes(needle)));
  }, [tier, kind, publisher, recheck, q]);
  const toggle = (n: number) => setOpen((o) => { const s = new Set(o); if (s.has(n)) s.delete(n); else s.add(n); return s; });
  let budget = limit;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl sm:text-4xl">References</h1>
      <p className="bx-prose mt-2">
        {provenance.references.total.toLocaleString()} public sources, grouped by tier and sorted by year within each. Every card says what kind of source it is (primary or secondary — a secondary
        source never carries a fact alone in this guide), how much of it was read, and whether it was rechecked against the live page; {provenance.references.rechecked.toLocaleString()} were.
        Quotations the recheck could not find verbatim are kept on the card, struck through, and key facts the recheck contradicted are labelled. Summaries come from the content pack and are never invented.
      </p>
      <p className="text-xs bx-muted mt-2">Scope anchors (sites named in the scope interview): {(scopeJson.anchors as { citation: string }[]).map((a) => a.citation).join(' · ')}. References on {ANCHOR_HOSTS.join(', ')} are marked; the SBA anchor names no single site and is not marked.</p>
      <div className="bx-card p-3 mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5 text-sm" role="search" aria-label="Filter references">
        <label className="block"><span className="block text-xs bx-muted mb-1">Tier</span><select className="bx-input" value={tier} onChange={(e) => set('tier', e.target.value)} data-testid="ref-tier"><option value="">All tiers</option>{TIER_GROUPS.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}</select></label>
        <label className="block"><span className="block text-xs bx-muted mb-1">Source kind</span><select className="bx-input" value={kind} onChange={(e) => set('kind', e.target.value)}><option value="">Both</option><option value="primary">Primary</option><option value="secondary">Secondary</option></select></label>
        <label className="block"><span className="block text-xs bx-muted mb-1">Publisher</span><select className="bx-input" value={publisher} onChange={(e) => set('publisher', e.target.value)}><option value="">All publishers</option>{publishers.map((p) => <option key={p} value={p}>{p.length > 60 ? `${p.slice(0, 58)}…` : p}</option>)}</select></label>
        <label className="block"><span className="block text-xs bx-muted mb-1">Recheck</span><select className="bx-input" value={recheck} onChange={(e) => set('recheck', e.target.value)}><option value="">Either</option><option value="yes">Rechecked against the live page</option><option value="no">Not rechecked</option></select></label>
        <label className="block"><span className="block text-xs bx-muted mb-1">Contains</span><input className="bx-input" value={q} onChange={(e) => set('q', e.target.value)} /></label>
      </div>
      <p className="mt-3 text-sm bx-muted" role="status">{shown.length.toLocaleString()} of {referencesIndex.length.toLocaleString()} references</p>
      {TIER_GROUPS.map((g) => {
        const list = shown.filter((r) => r.tier === g.id).sort((a, b) => (g.order === 'asc' ? a.year - b.year : b.year - a.year) || a.n - b.n);
        const visible = list.slice(0, Math.max(0, budget));
        budget -= visible.length;
        return (
          <section key={g.id} className="mt-8" aria-labelledby={`tier-${g.id}`} data-testid={`tier-${g.id}`}>
            <h2 id={`tier-${g.id}`} className="text-2xl flex items-baseline gap-2">{g.title} <span className="bx-tier">{list.length}</span></h2>
            <p className="text-sm bx-muted mt-1">{TIER_NOTE[g.id]}. {ORDER_NOTE[g.order]}</p>
            {list.length === 0 ? <p className="text-sm bx-muted mt-2">None in this pack{g.id === 'classic' ? ' (the content pack README records that the sweep’s tiers were remapped; tier_note on each card keeps the sweep tier)' : ''}.</p> : (
              <ul className="mt-2 grid gap-0.5">{visible.map((r) => <Row key={r.n} n={r.n} open={open.has(r.n)} onToggle={() => toggle(r.n)} />)}</ul>
            )}
            {visible.length < list.length && <p className="mt-2"><button type="button" className="bx-btn" onClick={() => setLimit((l) => l + 300)}>Show more ({list.length - visible.length} more in this tier)</button></p>}
          </section>
        );
      })}
    </div>
  );
}
