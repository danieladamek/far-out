/** Figure data loading + declared-field validation (CSV via papaparse, pathway JSON via zod). */
import fs from 'node:fs';
import path from 'node:path';
import Papa from 'papaparse';
import { PathwaySchema, type BuildError, type FigureDef, type Pathway } from './schemas';

export type Row = Record<string, string | number | null>;

/** Numbers stay numbers only when the whole cell is a plain number; "about 20" or "$1,000" stay text. */
export function parseCsv(text: string): { rows: Row[]; fields: string[] } {
  const res = Papa.parse<Record<string, string>>(text.trim(), { header: true, skipEmptyLines: true });
  const fields = res.meta.fields ?? [];
  const rows: Row[] = res.data.map((r) => {
    const o: Row = {};
    for (const f of fields) {
      const v = r[f] ?? '';
      o[f] = v === '' ? null : /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : v;
    }
    return o;
  });
  return { rows, fields };
}

/** A `ref` cell may hold one number or several separated by `;` (this pack writes "417;418;340"). */
export function refsOfCell(v: string | number | null | undefined): number[] {
  if (v === null || v === undefined || v === '') return [];
  return String(v).split(/[;,]\s*/).filter(Boolean).map(Number);
}

export interface LoadedFigure {
  table?: { rows: Row[]; fields: string[] };
  pathway?: Pathway;
}

export interface FigureCheckContext {
  termIds: Set<string>;
  sectionIds: Set<string>;
  refNs: Set<number>;
  topic: boolean;
  /** "routes/x", "programs/x", "gates/x"… for pathway node links */
  recordKeys: Set<string>;
}

function fieldsOfChart(chart: NonNullable<FigureDef['chart']>): string[] {
  const f: string[] = [];
  if (chart.x?.field) f.push(chart.x.field);
  if (chart.y?.field) f.push(chart.y.field);
  if (chart.series) f.push(chart.series.field);
  if (chart.ci) f.push(...chart.ci);
  return f;
}

export function loadFigureData(fig: FigureDef, packDir: string, ctx: FigureCheckContext, errors: BuildError[]): LoadedFigure {
  const out: LoadedFigure = {};
  const E = (message: string) => errors.push({ where: `figures/${fig.id}`, message });
  if (fig.script && !fs.existsSync(path.join(packDir, fig.script))) E(`script missing ${fig.script}`);
  if (['chart', 'table', 'network', 'pathway'].includes(fig.kind)) {
    if (!fig.data) E(`${fig.kind} needs data`);
    else {
      const p = path.join(packDir, fig.data);
      if (!fs.existsSync(p)) E(`data file missing ${fig.data}`);
      else if (fig.data.endsWith('.csv')) {
        const t = parseCsv(fs.readFileSync(p, 'utf8'));
        if (!t.rows.length) E('empty csv');
        for (const col of fig.columns ?? []) if (!t.fields.includes(col.field)) E(`column field ${col.field} not in csv`);
        if (fig.chart) for (const f of fieldsOfChart(fig.chart)) if (!t.fields.includes(f)) E(`chart field ${f} not in ${fig.data}`);
        // topic mode: every point in a synthesised data figure must be traceable to its own source
        if (ctx.topic && fig.synthesis === 'data') {
          if (!t.fields.includes('ref')) E(`synthesis: data csv needs a 'ref' column so every row is traceable (cols: ${t.fields.join(', ')})`);
          else for (const [i, r] of t.rows.entries()) {
            const ns = refsOfCell(r.ref);
            if (!ns.length) E(`row ${i + 1}: empty ref`);
            for (const n of ns) if (!Number.isInteger(n) || !ctx.refNs.has(n)) E(`row ${i + 1}: ref ${String(n)} has no reference entry`);
          }
        }
        out.table = t;
      } else if (fig.data.endsWith('.json')) {
        let raw: unknown;
        try { raw = JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { E(`${fig.data}: JSON parse error ${(e as Error).message}`); return out; }
        const parsed = PathwaySchema.safeParse(raw);
        if (!parsed.success) { for (const i of parsed.error.issues) E(`${fig.data}: ${i.path.join('/')} ${i.message}`); }
        else {
          const g = parsed.data;
          const ids = new Set(g.nodes.map((n) => n.id));
          const dup = g.nodes.map((n) => n.id).filter((id, i, a) => a.indexOf(id) !== i);
          if (dup.length) E(`duplicate node ids ${dup.join(', ')}`);
          for (const e of g.edges) {
            for (const end of ['from', 'to'] as const) if (!ids.has(e[end])) E(`edge endpoint ${e[end]} unknown`);
            for (const n of e.refs) if (!ctx.refNs.has(n)) E(`edge ${e.from}→${e.to} refs [${n}] has no reference entry`);
            // an edge's `routes` names the route nodes it summarises (node ids), or record ids directly
            for (const r of e.routes) if (!ids.has(r) && !ctx.recordKeys.has(`routes/${r}`) && !ctx.recordKeys.has(`programs/${r}`)) E(`edge ${e.from}→${e.to} routes -> unknown node or record ${r}`);
          }
          for (const n of g.nodes) {
            for (const r of n.refs) if (!ctx.refNs.has(r)) E(`node ${n.id} refs [${r}] has no reference entry`);
            const links = [n.record, n.route && `routes/${n.route}`, n.program && `programs/${n.program}`, n.gate && `gates/${n.gate}`].filter(Boolean) as string[];
            for (const l of links) if (!ctx.recordKeys.has(l)) E(`node ${n.id} links to unknown record ${l}`);
          }
          out.pathway = g;
        }
      } else E(`unsupported data format ${fig.data}`);
    }
  }
  if (fig.kind === 'image') {
    if (!fig.image || !fs.existsSync(path.join(packDir, fig.image))) E('image missing');
    if (!fig.hotspots.length) E('image needs ≥1 hotspot');
  }
  return out;
}
