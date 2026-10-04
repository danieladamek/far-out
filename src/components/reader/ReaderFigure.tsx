import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getFigure } from '@/lib/data';
import { loadFigure } from '@/lib/heavy';
import type { Figure } from '@/types';
import Prose from '@/components/records/Prose';

const FigureBody = lazy(() => import('@/components/figures/FigureBody'));

/**
 * Inline figure slot in the reader: the interactive component + caption + link to the figure page. The label,
 * title and caption come from the slim figure index and render immediately; the figure itself (and its data, which
 * for some figures is a long table) is loaded and built only once the slot is near the viewport, so the reader
 * keeps its performance budget.
 */
export default function ReaderFigure({ id }: { id: string }) {
  const meta = getFigure(id);
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const [fig, setFig] = useState<Figure | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || near) return;
    if (typeof IntersectionObserver === 'undefined') { setNear(true); return; }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { setNear(true); io.disconnect(); }
    }, { rootMargin: '800px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [near]);
  useEffect(() => { if (!near) return; let live = true; loadFigure(id).then((f) => { if (live) setFig(f); }); return () => { live = false; }; }, [near, id]);

  if (!meta) return <p><span className="bx-todo">figure {id} missing from the content pack</span></p>;

  return (
    <figure id={`fig-${meta.id}`} className="bx-card my-6 p-3 sm:p-4 scroll-mt-24 max-w-none" data-testid={`reader-figure-${meta.id}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm"><span className="font-semibold">{meta.label}.</span> <span className="bx-muted">{meta.title}</span></p>
        <span className="bx-chip bg-paper-2 dark:bg-night-2">{meta.provenance}</span>
      </div>
      <div ref={ref} className="mt-3 no-print-interactive" style={{ minHeight: fig ? undefined : 320 }}>
        {fig ? (
          <Suspense fallback={<div className="bx-muted text-sm min-h-[20rem]" role="status">Loading figure…</div>}>
            <FigureBody figure={fig} inline />
          </Suspense>
        ) : (
          <div className="min-h-[20rem] grid place-items-center rounded-md bg-paper-2/50 dark:bg-night-2/50 text-sm bx-muted" role="status">
            {meta.label} builds as you reach it
          </div>
        )}
      </div>
      {fig && <figcaption className="mt-3 text-sm leading-6 bx-muted"><Prose md={fig.caption} /></figcaption>}
      <p className="mt-2 text-sm"><Link className="underline font-semibold" to={`/figures/${meta.id}`}>Open the {meta.label} page → how to read it, what it is built from, download</Link></p>
    </figure>
  );
}
