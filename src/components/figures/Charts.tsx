import { useMemo, useRef, useState } from 'react';
// No <LabelList>: recharts 2.x renders it with a string ref, which React 18's StrictMode rejects in production.
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from 'recharts';
import type { ChartSpec, Row } from '@/types';
import { PALETTE } from '@/lib/data';
import { downloadCsv, svgToPng } from './download';

interface Props { id: string; spec: ChartSpec; rows: Row[]; fields: string[]; inline?: boolean }

const num = (v: unknown) => (typeof v === 'number' ? v : v == null || v === '' ? null : Number.isFinite(Number(v)) ? Number(v) : null);
/** Series colours from manifest.palette.groups, always paired with a glyph and the series name. */
const COLOURS = [PALETTE['setaside-vehicle'], PALETTE['sbir-sttr'], PALETTE.partnering, PALETTE['ot-cso'], PALETTE.gate, PALETTE.buyer].filter(Boolean);
const GLYPHS = ['●', '■', '▲', '◆', '★', '✚'];
const SHAPES = ['circle', 'square', 'triangle', 'diamond', 'star', 'cross'] as const;
const styleOf = (i: number) => ({ colour: COLOURS[i % COLOURS.length], glyph: GLYPHS[i % GLYPHS.length], shape: SHAPES[i % SHAPES.length] });

function Downloads({ png, csv }: { png: () => void; csv: () => void }) {
  return <span className="ml-auto inline-flex gap-1 no-print"><button type="button" className="bx-btn" onClick={png}>PNG</button><button type="button" className="bx-btn" onClick={csv}>CSV</button></span>;
}

function ToggleLegend({ items, hidden, onToggle }: { items: { key: string; colour: string; glyph: string }[]; hidden: Set<string>; onToggle: (k: string) => void }) {
  return (
    <ul className="flex flex-wrap gap-1.5 text-xs" aria-label="Series (select to show or hide)">
      {items.map((it) => (
        <li key={it.key}>
          <button type="button" className={`bx-btn !py-0.5 ${hidden.has(it.key) ? 'opacity-50 line-through' : ''}`} aria-pressed={!hidden.has(it.key)} onClick={() => onToggle(it.key)} data-testid="legend-toggle">
            <span aria-hidden="true" style={{ color: it.colour }}>{it.glyph}</span> {it.key}
          </button>
        </li>
      ))}
    </ul>
  );
}

function useFrame(id: string, rows: Row[], fields: string[]) {
  const ref = useRef<HTMLDivElement>(null);
  return { ref, png: () => { const svg = ref.current?.querySelector('svg.recharts-surface'); if (svg) svgToPng(svg as SVGSVGElement, `${id}.png`); }, csv: () => downloadCsv(rows, fields, `${id}.csv`) };
}

function TipRow({ p, keys }: { p: Row; keys: string[] }) {
  return <>{keys.filter((k) => p[k] != null && p[k] !== '').map((k) => <p key={k} className="mt-0.5"><span className="bx-muted">{k.replace(/_/g, ' ')}:</span> {String(p[k])}</p>)}</>;
}

/**
 * Grouped bars (fig2, fig3, fig5): one bar per series within each x group, exact values and the row's own source in
 * the tooltip, legend toggles, and a log/linear switch (posted amounts span two orders of magnitude). A missing
 * value is a gap, never a zero.
 */
export function GroupedBar({ id, spec, rows, fields, inline }: Props) {
  const xf = spec.x?.field ?? fields[0]; const yf = spec.y?.field ?? fields[1]; const sf = spec.series?.field;
  const series = sf ? [...new Set(rows.map((r) => String(r[sf])))] : [yf];
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [log, setLog] = useState(false);
  const { ref, png, csv } = useFrame(id, rows, fields);
  const data = useMemo(() => {
    const groups = new Map<string, Record<string, unknown>>();
    for (const r of rows) {
      const x = String(r[xf]);
      if (!groups.has(x)) groups.set(x, { [xf]: x });
      const g = groups.get(x)!;
      // dataKeys are positional (s0, s1…): a series name like "15 U.S.C. 644(g)" would be read as a property path
      const k = `s${sf ? series.indexOf(String(r[sf])) : 0}`;
      g[k] = num(r[yf]);
      g[`__row:${k}`] = r;
    }
    return [...groups.values()];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, xf, yf, sf]);
  const positive = rows.every((r) => (num(r[yf]) ?? 1) > 0);
  const extraKeys = fields.filter((f) => ![xf, yf, sf].includes(f));
  const many = data.length > 8;
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <ToggleLegend items={series.map((s, i) => ({ key: s, ...styleOf(i) }))} hidden={hidden} onToggle={(k) => setHidden((h) => { const n = new Set(h); if (n.has(k)) n.delete(k); else n.add(k); return n; })} />
        {positive && <button type="button" className={`bx-btn !py-0.5 text-xs ${log ? 'bx-btn-on' : ''}`} aria-pressed={log} onClick={() => setLog((l) => !l)} data-testid="log-toggle">Log scale</button>}
        {!inline && <Downloads png={png} csv={csv} />}
      </div>
      <p className="text-xs bx-muted mt-1">{spec.y?.label ?? yf}{log ? ' — logarithmic axis' : ''}</p>
      <div ref={ref} className="mt-1" style={{ width: '100%', height: many ? (inline ? 520 : 620) : inline ? 320 : 400 }} role="img" aria-label={`Grouped bar chart of ${spec.y?.label ?? yf} by ${spec.x?.label ?? xf}${sf ? ` and ${spec.series?.label ?? sf}` : ''}. Every value is in the table below.`} data-testid={`chart-${id}`}>
        <ResponsiveContainer>
          <BarChart data={data} layout={many ? 'vertical' : 'horizontal'} margin={{ top: 8, right: 16, left: 8, bottom: many ? 8 : 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--bx-line)" />
            {many ? (
              <>
                <XAxis type="number" scale={log ? 'log' : 'auto'} domain={log ? ['auto', 'auto'] : [0, 'auto']} allowDataOverflow tick={{ fill: 'var(--bx-muted)', fontSize: 11 }} tickFormatter={(v: number) => v.toLocaleString('en-US', { notation: 'compact' })} />
                <YAxis type="category" dataKey={xf} width={inline ? 170 : 240} interval={0} tick={{ fill: 'var(--bx-muted)', fontSize: 10 }} />
              </>
            ) : (
              <>
                <XAxis dataKey={xf} interval={0} tick={{ fill: 'var(--bx-muted)', fontSize: 11 }} label={{ value: spec.x?.label ?? xf, position: 'insideBottom', offset: -28, fill: 'var(--bx-muted)', fontSize: 12 }} />
                <YAxis scale={log ? 'log' : 'auto'} domain={log ? ['auto', 'auto'] : [0, 'auto']} allowDataOverflow width={64} tick={{ fill: 'var(--bx-muted)', fontSize: 11 }} tickFormatter={(v: number) => v.toLocaleString('en-US', { notation: 'compact' })} />
              </>
            )}
            <Tooltip
              cursor={{ fill: 'var(--bx-bg-2)' }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const g = payload[0].payload as Record<string, unknown>;
                return (
                  <div className="bx-card p-2 text-xs max-w-[22rem] bg-paper dark:bg-night" data-testid="chart-tooltip">
                    <p className="font-semibold">{String(g[xf])}</p>
                    {payload.map((p) => { const r = g[`__row:${String(p.dataKey)}`] as Row | undefined; return r ? (
                      <div key={String(p.dataKey)} className="mt-1 border-t border-[color:var(--bx-line)] pt-1">
                        <p><span style={{ color: p.color }} aria-hidden="true">■ </span>{String(p.name)}: <strong>{String(r[yf])}</strong></p>
                        <TipRow p={r} keys={extraKeys} />
                      </div>) : null; })}
                  </div>
                );
              }}
            />
            {series.map((s, i) => !hidden.has(s) && <Bar key={s} dataKey={`s${i}`} name={s} fill={styleOf(i).colour} isAnimationActive={false} />)}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 text-xs bx-muted">Hover or focus a bar for its exact value as published and its source. Toggle a series in the legend; a missing value is a gap, not a zero.</p>
    </div>
  );
}

/** A dated scatter (fig7): x is a date, y a category (the status word), series shaped and coloured, details in the tooltip. */
export function DateScatter({ id, spec, rows, fields, inline }: Props) {
  const xf = spec.x?.field ?? fields[0]; const yf = spec.y?.field ?? fields[1]; const sf = spec.series?.field;
  const series = sf ? [...new Set(rows.map((r) => String(r[sf])))] : ['all'];
  const cats = [...new Set(rows.map((r) => String(r[yf])))];
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const { ref, png, csv } = useFrame(id, rows, fields);
  const pts: (Row & { __x: number; __y: number })[] = rows.map((r) => ({ ...r, __x: Date.parse(`${String(r[xf])}T00:00:00Z`), __y: cats.indexOf(String(r[yf])) })).filter((p) => Number.isFinite(p.__x));
  const fmt = (t: number) => new Date(t).toISOString().slice(0, 7);
  const extraKeys = fields.filter((f) => f !== xf);
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <ToggleLegend items={series.map((s, i) => ({ key: s, ...styleOf(i) }))} hidden={hidden} onToggle={(k) => setHidden((h) => { const n = new Set(h); if (n.has(k)) n.delete(k); else n.add(k); return n; })} />
        {!inline && <Downloads png={png} csv={csv} />}
      </div>
      <div ref={ref} className="mt-2" style={{ width: '100%', height: inline ? 340 : 420 }} role="img" aria-label={`Timeline of ${rows.length} dated changes by ${spec.y?.label ?? yf}. Every entry is in the table below.`} data-testid={`chart-${id}`}>
        <ResponsiveContainer>
          <ScatterChart margin={{ top: 12, right: 16, left: 8, bottom: 28 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--bx-line)" />
            <XAxis type="number" dataKey="__x" domain={['dataMin - 2592000000', 'dataMax + 2592000000']} tickFormatter={fmt} tick={{ fill: 'var(--bx-muted)', fontSize: 11 }} label={{ value: spec.x?.label ?? xf, position: 'insideBottom', offset: -16, fill: 'var(--bx-muted)', fontSize: 12 }} />
            <YAxis type="number" dataKey="__y" domain={[-0.5, cats.length - 0.5]} ticks={cats.map((_, i) => i)} tickFormatter={(v: number) => cats[v] ?? ''} width={150} interval={0} tick={{ fill: 'var(--bx-muted)', fontSize: 11 }} />
            <ZAxis range={[70, 70]} />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload as Row;
              return <div className="bx-card p-2 text-xs max-w-[22rem] bg-paper dark:bg-night" data-testid="chart-tooltip"><p className="font-semibold">{String(p.title ?? p[xf])}</p><TipRow p={p} keys={extraKeys.filter((k) => k !== 'title')} /></div>;
            }} />
            {series.map((s, i) => !hidden.has(s) && <Scatter key={s} name={s} data={pts.filter((p) => !sf || String(p[sf]) === s)} fill={styleOf(i).colour} shape={styleOf(i).shape} isAnimationActive={false} />)}
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 text-xs bx-muted">Hover or focus a point for the change, its date, status and sources. Points on the same date and status overlap; every one is in the table below.</p>
    </div>
  );
}

export default function Charts(props: Props) {
  if (props.spec.type === 'scatter') return <DateScatter {...props} />;
  return <GroupedBar {...props} />;
}
