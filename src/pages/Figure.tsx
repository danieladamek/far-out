import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Figure as FigureT } from '@/types';
import { figuresIndex as figures } from '@/lib/data';
import { loadFigure } from '@/lib/heavy';
import FigureFrame from '@/components/figures/FigureFrame';
import NotFound from './NotFound';

export default function Figure() {
  const { id } = useParams();
  const meta = figures.find((x) => x.id === id);
  const [f, setF] = useState<FigureT | null>(null);
  useEffect(() => { let live = true; setF(null); if (id) loadFigure(id).then((x) => { if (live) setF(x); }); return () => { live = false; }; }, [id]);
  if (!meta) return <NotFound />;
  const idx = figures.findIndex((x) => x.id === meta.id);
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {f ? <FigureFrame figure={f} /> : (
        <div className="bx-card p-4 sm:p-6 min-h-[40rem]">
          <p className="text-[11px] font-semibold tracking-[0.15em] bx-muted">{meta.label.toUpperCase()} · {meta.kind.toUpperCase()}</p>
          <h1 className="text-2xl sm:text-3xl mt-1">{meta.title}</h1>
          <p className="mt-4 bx-muted" role="status">Loading the figure…</p>
        </div>
      )}
      <p className="mt-6 flex flex-wrap gap-2 text-sm">
        {idx > 0 && <Link className="bx-btn" to={`/figures/${figures[idx - 1].id}`}>← {figures[idx - 1].label}</Link>}
        {idx < figures.length - 1 && <Link className="bx-btn" to={`/figures/${figures[idx + 1].id}`}>{figures[idx + 1].label} →</Link>}
        <Link className="bx-btn ml-auto" to="/figures">All figures</Link>
      </p>
    </div>
  );
}
