import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Figure, Pathway as PathwayT, PathwayEdge, PathwayNode } from '@/types';
import { familyColour } from '@/lib/data';
import { recordsIndexById } from '@/lib/records';
import { svgToPng } from './download';
import CiteList from '@/components/records/CiteList';

const COL_W = 250, ROW_H = 46, NODE_W = 214, NODE_H = 36, PAD = 16;

/** Wrap a label into at most two lines of ~34 characters (the full label is in the card). */
function lines(label: string, max = 34): string[] {
  const words = label.split(/\s+/); const out: string[] = []; let cur = '';
  for (const w of words) { if ((cur + ' ' + w).trim().length > max && cur) { out.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); }
  if (cur) out.push(cur);
  return out.length > 2 ? [out[0], `${out[1].slice(0, max - 1)}…`] : out;
}

/** Where a node links: `record: "gates/x"`, or `route`/`program`/`gate` ids (KICKOFF §4 /figures). */
function linkOf(n: PathwayNode): { to: string; title: string } | null {
  const key = n.record ?? (n.route ? `routes/${n.route}` : n.program ? `programs/${n.program}` : n.gate ? `gates/${n.gate}` : null);
  if (!key) return n.family ? { to: `/routes?family=${n.family}`, title: 'the routes in this family' } : null;
  const m = recordsIndexById.get(key);
  return m ? { to: m.to, title: m.title } : null;
}

/**
 * Fixed-layout pathway diagram from the pack's `col`/`row` (route-decision, sbir-phases). Nodes are buttons:
 * hover, focus or click shows the node's card (detail, governing text, sources, the record it links to) and
 * highlights its edges; an edge can be selected the same way.
 */
export default function Pathway({ figure, data, inline }: { figure: Figure; data: PathwayT; inline?: boolean }) {
  const [sel, setSel] = useState<{ node?: string; edge?: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const minRow = Math.min(...data.nodes.map((n) => n.row));
  const maxRow = Math.max(...data.nodes.map((n) => n.row));
  const maxCol = Math.max(...data.nodes.map((n) => n.col));
  const pos = useMemo(() => new Map(data.nodes.map((n) => [n.id, { x: PAD + n.col * COL_W, y: PAD + (n.row - minRow) * ROW_H }])), [data, minRow]);
  const W = PAD * 2 + maxCol * COL_W + NODE_W, H = PAD * 2 + (maxRow - minRow) * ROW_H + NODE_H;
  const touches = (e: PathwayEdge) => !!sel?.node && (e.from === sel.node || e.to === sel.node);
  const selNode = sel?.node ? data.nodes.find((n) => n.id === sel.node) : undefined;
  const selEdge = sel?.edge !== undefined ? data.edges[sel.edge] : undefined;
  const nodeById = new Map(data.nodes.map((n) => [n.id, n]));
  const stroke = (n: PathwayNode) => (n.family ? familyColour(n.family) : n.kind === 'gate' ? familyColour('gate') : 'var(--bx-line)');

  return (
    <div>
      {!inline && (
        <div className="flex flex-wrap gap-1 justify-end no-print">
          <button type="button" className="bx-btn" onClick={() => svgRef.current && svgToPng(svgRef.current, `${figure.id}.png`)}>PNG</button>
        </div>
      )}
      <div className="mt-2 overflow-auto rounded-md border border-[color:var(--bx-line)]" style={{ maxHeight: inline ? 520 : 760 }}>
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ width: '100%', minWidth: Math.round(W * 0.62), height: 'auto' }} role="group" aria-label={`${figure.label}: ${figure.title}. ${data.nodes.length} nodes; select one for its card.`} data-testid={`pathway-${figure.id}`} className="block">
          <defs>
            <marker id={`arr-${figure.id}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor" /></marker>
          </defs>
          <g className="text-[color:var(--bx-muted)]">
            {data.edges.map((e, i) => {
              const a = pos.get(e.from), b = pos.get(e.to);
              if (!a || !b) return null;
              const forward = b.x > a.x;
              const x1 = forward ? a.x + NODE_W : a.x + NODE_W / 2, y1 = forward ? a.y + NODE_H / 2 : a.y + (b.y > a.y ? NODE_H : 0);
              const x2 = forward ? b.x : b.x + NODE_W / 2, y2 = forward ? b.y + NODE_H / 2 : b.y + (b.y > a.y ? 0 : NODE_H);
              const mx = (x1 + x2) / 2;
              const d = forward ? `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}` : `M${x1},${y1} L${x2},${y2}`;
              const on = touches(e) || sel?.edge === i;
              return (
                <g key={i}>
                  <path d={d} fill="none" stroke="currentColor" strokeWidth={on ? 2.2 : 1} strokeOpacity={sel && !on ? 0.25 : 0.8} strokeDasharray={e.kind === 'member' || e.kind === 'contains' ? '4 3' : undefined} markerEnd={`url(#arr-${figure.id})`} />
                  <path d={d} fill="none" stroke="transparent" strokeWidth={10} onMouseEnter={() => setSel({ edge: i })} onClick={() => setSel({ edge: i })} style={{ cursor: 'pointer' }}><title>{`${nodeById.get(e.from)?.label ?? e.from} → ${nodeById.get(e.to)?.label ?? e.to}${e.label ? ` (${e.label})` : ''}`}</title></path>
                </g>
              );
            })}
          </g>
          {data.nodes.map((n) => {
            const p = pos.get(n.id)!;
            const on = sel?.node === n.id || (selEdge && (selEdge.from === n.id || selEdge.to === n.id));
            const ls = lines(n.label);
            return (
              <g key={n.id} transform={`translate(${p.x},${p.y})`} tabIndex={0} role="button" aria-label={`${n.label} (${n.kind})`} aria-pressed={sel?.node === n.id}
                onMouseEnter={() => setSel({ node: n.id })} onFocus={() => setSel({ node: n.id })} onClick={() => setSel({ node: n.id })}
                onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); setSel({ node: n.id }); } }}
                style={{ cursor: 'pointer', outline: 'none' }} data-testid={`node-${n.id}`}>
                <rect width={NODE_W} height={NODE_H} rx={n.kind === 'family' || n.kind === 'question' || n.kind === 'start' ? 18 : 6}
                  fill={n.kind === 'family' ? familyColour(n.family) : 'var(--bx-bg)'} fillOpacity={n.kind === 'family' ? 0.16 : 1}
                  stroke={stroke(n)} strokeWidth={on ? 3 : n.kind === 'family' ? 2 : 1.4} opacity={sel && !on && !(sel.node && data.edges.some((e) => touches(e) && (e.from === n.id || e.to === n.id))) ? 0.45 : 1} />
                <text x={10} y={ls.length === 1 ? NODE_H / 2 + 4 : 15} fontSize={11} fill="var(--bx-ink)" fontWeight={n.kind === 'family' || n.kind === 'question' ? 600 : 400}>
                  {ls.map((l, i) => <tspan key={i} x={10} dy={i === 0 ? 0 : 13}>{l}</tspan>)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="mt-3 bx-card p-3 text-sm min-h-[5.5rem]" aria-live="polite" data-testid="pathway-card">
        {!sel && <p className="bx-muted">Hover, focus or click a box or an arrow for its details, its sources and the record it links to. Dashed arrows mark membership in a group.</p>}
        {selNode && (() => { const l = linkOf(selNode); return (
          <div>
            <p className="font-semibold">{selNode.label} <span className="bx-chip border border-[color:var(--bx-line)] bx-muted ml-1">{selNode.kind}</span></p>
            {selNode.detail && <p className="mt-1">{selNode.detail}</p>}
            {selNode.governing_text && <p className="mt-1 text-xs"><span className="font-semibold">Governing text: </span>{selNode.governing_text}</p>}
            {selNode.situations.length > 0 && <p className="mt-1 text-xs bx-muted">Situations: {selNode.situations.join(', ')}</p>}
            {selNode.refs.length > 0 && <div className="mt-1"><CiteList ns={selNode.refs} /></div>}
            {l && <p className="mt-1"><Link className="underline font-semibold" to={l.to}>Open {l.title} →</Link></p>}
          </div>
        ); })()}
        {selEdge && (
          <div>
            <p className="font-semibold">{nodeById.get(selEdge.from)?.label} → {nodeById.get(selEdge.to)?.label}</p>
            {selEdge.label && <p className="mt-1">{selEdge.label}</p>}
            {selEdge.routes.length > 0 && <p className="mt-1 text-xs bx-muted">Through: {selEdge.routes.map((r) => nodeById.get(r)?.label ?? r).join(' · ')}</p>}
            {selEdge.refs.length > 0 && <div className="mt-1"><CiteList ns={selEdge.refs} /></div>}
          </div>
        )}
      </div>
      {data.note && <p className="mt-2 text-xs bx-muted">{data.note}</p>}
    </div>
  );
}
