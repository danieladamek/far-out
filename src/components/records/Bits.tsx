import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { PendingChange, RecordType } from '@/types';
import { familyColour, FAMILY_LABEL, STATUS_WORD } from '@/lib/data';
import { recordMeta } from '@/lib/records';
import { loadReference } from '@/lib/heavy';
import type { Reference } from '@/types';
import ReferenceCard from '@/components/reader/ReferenceCard';
import NoteButton from '@/components/notepad/NoteButton';
import Prose from './Prose';
import type { Anchor } from '@/lib/notepad';

export const BlockLabel = ({ children, id }: { children: ReactNode; id?: string }) => <h2 id={id} className="text-[11px] font-semibold tracking-[0.15em] bx-muted font-body uppercase mt-6 mb-1.5">{children}</h2>;

export function FamilyChip({ family }: { family?: string | null }) {
  if (!family) return null;
  return (
    <Link to={`/routes?family=${family}`} className="bx-chip border border-[color:var(--bx-line)] hover:underline" data-testid="family-chip">
      <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: familyColour(family) }} />
      {FAMILY_LABEL[family as keyof typeof FAMILY_LABEL] ?? family}
    </Link>
  );
}

export const AsOf = ({ date }: { date: string }) => <span className="bx-asof" data-testid="record-asof">as of {date}</span>;

/** `pending_changes[]`: a labelled block, each with its status word and date. A class deviation is where the FAR-overhaul numbering lives. */
export function PendingChanges({ items, title = 'Pending and recent changes' }: { items: PendingChange[]; title?: string }) {
  if (!items?.length) return null;
  const sorted = [...items].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  return (
    <section aria-label={title} data-testid="pending-changes">
      <BlockLabel>{title}</BlockLabel>
      <ul className="grid gap-2">
        {sorted.map((p, i) => (
          <li key={i} className="bx-card p-2.5 text-sm">
            <p className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="bx-status font-semibold">{STATUS_WORD[p.status] ?? p.status}</span>
              <span className="bx-chip bg-paper-2 dark:bg-night-2 tabular-nums">{p.date}</span>
              {p.status === 'class-deviation' && <span className="bx-muted">FAR-overhaul numbering; the codified FAR number stays the primary citation</span>}
            </p>
            <Prose md={p.text} className="mt-1" />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** `conflicts[]` — where official sources differ. Both figures are shown; none is picked. */
export function Conflicts({ items }: { items: string[] }) {
  if (!items?.length) return null;
  return (
    <section aria-label="Where official sources differ" data-testid="conflicts">
      <BlockLabel>Where official sources differ</BlockLabel>
      <ul className="grid gap-1.5 border-l-2 border-amber-500 pl-3">
        {items.map((c, i) => <li key={i}><Prose md={c} /></li>)}
      </ul>
    </section>
  );
}

export function OfficialLink({ url, label = 'Official page' }: { url?: string | null; label?: string }) {
  if (!url) return null;
  return <p className="text-sm"><span className="font-semibold">{label}: </span><a className="underline break-all" href={url} target="_blank" rel="noreferrer">{url} ↗</a></p>;
}

type RefMeta = import('@/types').ReferenceMeta;
let indexPromise: Promise<RefMeta[]> | null = null;
const loadIndex = () => (indexPromise ??= import('@/lib/extras').then((m) => m.referencesIndex));
function useRefIndex(): RefMeta[] | undefined {
  const [idx, setIdx] = useState<RefMeta[]>();
  useEffect(() => { let live = true; void loadIndex().then((x) => { if (live) setIdx(x); }); return () => { live = false; }; }, []);
  return idx;
}

function SourceRow({ n, index }: { n: number; index: RefMeta[] }) {
  const [open, setOpen] = useState(false);
  const [ref, setRef] = useState<Reference | null | undefined>();
  const meta = index[n - 1]?.n === n ? index[n - 1] : index.find((r) => r.n === n);
  const toggle = () => { const o = !open; setOpen(o); if (o && ref === undefined) loadReference(n).then(setRef); };
  return (
    <li className="text-sm">
      <button type="button" className="text-left w-full hover:bg-paper-2 dark:hover:bg-night-2 rounded px-1 py-0.5" aria-expanded={open} onClick={toggle}>
        <span className="font-semibold">[{n}]</span> {meta ? meta.citation : <span className="bx-todo">reference not in the pack</span>}
        {meta && <span className="ml-1 text-xs bx-muted">· {meta.tier} · {meta.source_kind}{meta.rechecked ? ' · rechecked' : ' · not rechecked'}</span>}
      </button>
      {open && <div className="bx-foldout">{ref ? <ReferenceCard r={ref} compact /> : ref === null ? <span className="bx-todo">reference [{n}] not in the pack</span> : <span role="status" className="bx-muted">Loading…</span>}</div>}
    </li>
  );
}

/** `sources[]` as reference cards behind a disclosure each. */
export function Sources({ ns }: { ns: number[] }) {
  const index = useRefIndex();
  if (!ns?.length) return null;
  return (
    <section aria-label="Sources" data-testid="sources">
      <BlockLabel>Sources ({ns.length})</BlockLabel>
      {index ? <ul className="grid gap-0.5">{ns.map((n) => <SourceRow key={n} n={n} index={index} />)}</ul> : <p className="text-sm bx-muted" role="status">Loading {ns.length} sources…</p>}
    </section>
  );
}

/** Links to records by bare id (gates, programs, affected records). Unknown ids are shown, amber, not hidden. */
export function RecordLinks({ type, ids }: { type: RecordType; ids: string[] }) {
  return (
    <span className="inline-flex flex-wrap gap-1.5">
      {ids.map((id) => {
        const m = recordMeta(type, id);
        return m ? <Link key={id} className="bx-chip border border-[color:var(--bx-line)] hover:underline" to={m.to}>{m.title}</Link>
          : <span key={id} className="bx-todo" title="This id is not in the pack — listed on /methods as a build error">{id} (unknown {type.replace(/s$/, '')})</span>;
      })}
    </span>
  );
}

/** Header for every record page/card: title, chips, notepad anchor. */
export function RecordHeader({ title, anchor, children, level = 1 }: { title: string; anchor: Anchor; children?: ReactNode; level?: 1 | 2 | 3 }) {
  const H = (`h${level}`) as 'h1' | 'h2' | 'h3';
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <H className={level === 1 ? 'text-3xl sm:text-4xl leading-tight' : level === 2 ? 'text-xl sm:text-2xl' : 'text-lg'}>{title}</H>
        <NoteButton anchor={anchor} label={title} />
      </div>
      {children && <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">{children}</p>}
    </div>
  );
}

export const ListOf = ({ items }: { items: string[] }) => (items?.length ? <ul className="list-disc pl-5 grid gap-1">{items.map((s, i) => <li key={i}><Prose md={s} /></li>)}</ul> : null);
