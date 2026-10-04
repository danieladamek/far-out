import { lazy, Suspense } from 'react';
import type { Figure } from '@/types';
import Pathway from './Pathway';
import DataTable from './DataTable';
import Todo from '@/components/ui/Todo';

const Charts = lazy(() => import('./Charts'));

/** One component per figure kind (APP-SPEC §4). `inline` = the compact variant embedded in the guide and on record pages. */
export default function FigureBody({ figure, inline }: { figure: Figure; inline?: boolean }) {
  switch (figure.kind) {
    case 'pathway':
    case 'network':
      return figure.pathway ? <Pathway figure={figure} data={figure.pathway} inline={inline} /> : <Todo>no node/edge data for {figure.id}</Todo>;
    case 'table':
      return <DataTable figure={figure} rows={figure.table?.rows ?? []} inline={inline} />;
    case 'chart':
      return (
        <div>
          {figure.chart ? (
            <Suspense fallback={<div className="bx-muted text-sm" style={{ minHeight: (figure.table?.rows.length ?? 0) > 16 ? (inline ? 590 : 690) : (inline ? 390 : 470) }} role="status">Loading figure…</div>}>
              <Charts id={figure.id} spec={figure.chart} rows={figure.table?.rows ?? []} fields={figure.table?.fields ?? []} inline={inline} />
            </Suspense>
          ) : <Todo>chart {figure.id} has no chart spec</Todo>}
          {figure.table && (
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer bx-muted">Every value in this figure, with its own source ({figure.table.rows.length} rows)</summary>
              <div className="mt-2"><DataTable figure={figure} rows={figure.table.rows} inline={inline} /></div>
            </details>
          )}
        </div>
      );
    case 'image':
      return <Todo>this pack reproduces no published figure images; nothing to show for {figure.id}</Todo>;
  }
}
