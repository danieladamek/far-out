import { Fragment, lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import sectionsJson from '@/data/sections.json';
import type { Section } from '@/types';
import { AS_OF, asOfLong, getSection, manifest, provenance } from '@/lib/data';
import { useNotepad } from '@/lib/notepad-context';
import { groupBySection, type NoteGroup } from '@/lib/notepad';
import { loadAnchorIndex } from '@/lib/notes-index';
import Markdown from '@/components/reader/Markdown';
import SectionRail from '@/components/reader/SectionRail';
import ReaderFigure from '@/components/reader/ReaderFigure';
import Drawer from '@/components/ui/Drawer';
const NotepadPanel = lazy(() => import('@/components/notepad/NotepadPanel'));

const sections = sectionsJson as unknown as Section[];
const HEADINGS = { 1: 'h2', 2: 'h2', 3: 'h3', 4: 'h4' } as const;
const BANNER_KEY = `bx-banner-dismissed:${manifest.slug}`;

function useMedia(q: string): boolean {
  const [m, setM] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(q).matches);
  useEffect(() => { const mq = window.matchMedia(q); const on = () => setM(mq.matches); mq.addEventListener('change', on); return () => mq.removeEventListener('change', on); }, [q]);
  return m;
}

function SectionHeading({ depth, number, title, id }: { depth: number; number: string | null; title: string; id: string }) {
  const Tag = HEADINGS[(Math.min(Math.max(depth, 1), 4)) as 1 | 2 | 3 | 4];
  const cls = depth <= 2 ? 'text-2xl sm:text-3xl mt-10' : depth === 3 ? 'text-xl sm:text-2xl mt-8' : 'text-lg sm:text-xl mt-6';
  return (
    <Tag id={`h-${id}`} className={`${cls} scroll-mt-24 group`}>
      {title}{' '}
      <a href={`#${id}`} className="bx-muted text-sm font-body no-underline opacity-0 group-hover:opacity-100 focus:opacity-100" aria-label={`Link to section ${number ?? title}`}>#</a>
    </Tag>
  );
}

/** The commissioned-review banner (DESIGN-SYSTEM §3.1). Dismissal is per-slug; the as_of chip never hides. */
function Banner() {
  const [dismissed, setDismissed] = useState(() => { try { return localStorage.getItem(BANNER_KEY) === '1'; } catch { return false; } });
  if (dismissed) return null;
  return (
    <div className="bx-banner no-print" data-testid="review-banner">
      <div className="flex items-start gap-3">
        <p className="flex-1">
          Written by the {manifest.builder.name} from {provenance.references.total.toLocaleString()} sources, current as of {asOfLong()}.
          Every claim is cited; passages marked <em>synthesis</em> draw conclusions the cited works do not individually state.
          This is a commissioned guide: <strong>not peer reviewed, not official, not advice</strong>.
        </p>
        <button type="button" className="bx-btn !py-0.5 !px-2 text-xs" onClick={() => { setDismissed(true); try { localStorage.setItem(BANNER_KEY, '1'); } catch { /* ignore */ } }} aria-label="Dismiss the commissioned-review notice">Dismiss</button>
      </div>
    </div>
  );
}

export default function Read() {
  const loc = useLocation();
  const notepad = useNotepad();
  const [active, setActive] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [sel, setSel] = useState<{ x: number; y: number; text: string; section: string } | null>(null);
  const articleRef = useRef<HTMLElement>(null);
  // Print stylesheet (APP-SPEC §3): the reader prints alone; "Print with my notes" appends the notes, by section.
  const [printNotes, setPrintNotes] = useState<NoteGroup[] | null>(null);
  const printWithNotes = async () => {
    const idx = await loadAnchorIndex();
    setPrintNotes(groupBySection(notepad.state, idx));
    requestAnimationFrame(() => requestAnimationFrame(() => { window.print(); setPrintNotes(null); }));
  };
  // APP-SPEC §3.1: docked beside the reader on screens ≥ 1280 px, a drawer below that
  const wide = useMedia('(min-width: 1280px)');

  // Keep the reader's place. Figures build lazily as they near the viewport and change height, and opening or
  // closing the docked notepad changes the body column's width; either reflows the text above the paragraph being
  // read. The paragraph at the top of the view is remembered on every scroll, and whenever the article changes
  // size the page is scrolled back so that paragraph stays where it was. A deep link is the same thing with the
  // target section as the remembered paragraph.
  const place = useRef<{ el: Element; top: number } | null>(null);
  const remember = useCallback(() => {
    const art = articleRef.current;
    if (!art) return;
    const r = art.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + Math.min(r.width / 2, 200), 140);
    const el = hit?.closest('[id^="syn-"], [data-section] > p, [data-section] > div, [data-section] > figure, [data-section] > h2, [data-section] > h3');
    if (el && art.contains(el)) place.current = { el, top: el.getBoundingClientRect().top };
  }, []);
  useEffect(() => {
    const art = articleRef.current;
    if (!art || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      const p = place.current;
      if (!p || !p.el.isConnected) return;
      const d = p.el.getBoundingClientRect().top - p.top;
      if (Math.abs(d) > 1) window.scrollBy({ top: d, behavior: 'instant' });
    });
    ro.observe(art);
    const on = () => remember();
    window.addEventListener('scroll', on, { passive: true });
    return () => { ro.disconnect(); window.removeEventListener('scroll', on); };
  }, [remember]);

  // ?section=id (DESIGN-SYSTEM) and #id
  useEffect(() => {
    const q = new URLSearchParams(loc.search).get('section');
    const hash = q && getSection(q) ? q : loc.hash.slice(1);
    if (!hash) return;
    requestAnimationFrame(() => {
      const el = document.getElementById(hash);
      if (!el) return;
      el.scrollIntoView({ behavior: 'instant' });
      place.current = { el, top: el.getBoundingClientRect().top };
    });
  }, [loc.search, loc.hash]);

  // active section + progress
  useEffect(() => {
    const els = sections.map((s) => document.getElementById(s.id)).filter((e): e is HTMLElement => !!e);
    const io = new IntersectionObserver((entries) => {
      const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) setActive(visible[0].target.id);
    }, { rootMargin: '-15% 0px -70% 0px', threshold: 0 });
    els.forEach((e) => io.observe(e));
    const onScroll = () => { const h = document.documentElement; const max = h.scrollHeight - h.clientHeight; setProgress(max > 0 ? Math.min(1, h.scrollTop / max) : 0); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { io.disconnect(); window.removeEventListener('scroll', onScroll); };
  }, []);

  // text selection → "Add note", anchored to the section the selection starts in, with the quote
  const onSelect = useCallback(() => {
    const s = window.getSelection();
    const text = s?.toString().trim();
    if (!s || !text || s.rangeCount === 0 || !articleRef.current) { setSel(null); return; }
    const range = s.getRangeAt(0);
    if (!articleRef.current.contains(range.commonAncestorContainer)) { setSel(null); return; }
    const node = range.startContainer instanceof Element ? range.startContainer : range.startContainer.parentElement;
    const sec = node?.closest('section[data-section]');
    const rect = range.getBoundingClientRect();
    setSel({ x: rect.left + rect.width / 2 + window.scrollX, y: rect.top + window.scrollY - 8, text, section: sec?.getAttribute('data-section') ?? sections[0].id });
  }, []);
  const addNote = () => {
    if (!sel) return;
    notepad.addNote({ type: 'section', id: sel.section }, sel.text);
    notepad.setOpen(true);
    setSel(null);
    window.getSelection()?.removeAllRanges();
  };

  return (
    <div className="relative">
      <div className="bx-progress fixed left-0 top-0 z-50 h-0.5 bg-[color:var(--bx-accent)]" style={{ width: `${progress * 100}%` }} aria-hidden="true" />
      <div className={`mx-auto max-w-[1480px] px-4 py-8 xl:grid xl:gap-8 ${notepad.open && wide ? 'xl:grid-cols-[220px_minmax(0,1fr)_360px]' : 'xl:grid-cols-[220px_minmax(0,1fr)]'}`}>
        <aside className="hidden xl:block"><div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pr-2"><SectionRail active={active} variant="rail" /></div></aside>
        <div className="min-w-0">
          <div className="xl:hidden mb-4"><SectionRail active={active} variant="select" /></div>
          <article ref={articleRef} className="bx-reader mx-auto" onMouseUp={onSelect} onKeyUp={(e) => { if (e.shiftKey) onSelect(); }} aria-label="The commissioned guide">
            <header>
              <p className="flex flex-wrap items-center gap-2 no-print">
                <span className="bx-chip border border-[color:var(--bx-line)] bx-muted">COMMISSIONED GUIDE — NOT PEER REVIEWED · NOT ADVICE</span>
                <span className="bx-asof" data-testid="read-asof">Current as of {AS_OF}</span>
              </p>
              <h1 className="text-3xl sm:text-4xl leading-tight mt-3">{manifest.title}</h1>
              <p className="mt-2 text-sm bx-muted no-print">
                {manifest.authors.join(', ')} · about {manifest.reading_minutes} minutes. Dotted terms open the glossary; bracketed numbers open the reference
                that supports the claim. The routes, gates and programs the guide describes each have their own page, starting at <Link className="underline" to="/routes">Routes</Link>.
              </p>
              <Banner />
            </header>
            {sections.map((s) => (
              <section key={s.id} id={s.id} data-section={s.id} className="scroll-mt-20" aria-labelledby={`h-${s.id}`}>
                <SectionHeading depth={s.depth} number={s.number} title={s.title} id={s.id} />
                {s.chunks.map((c, i) => {
                  if (c.kind === 'figure') return <ReaderFigure key={i} id={c.id} />;
                  if (c.marker === 'synthesis' && c.id) {
                    return (
                      <div key={i} id={c.id} className="bx-synthesis scroll-mt-24" data-testid="synthesis-block">
                        <span className="bx-synthesis-label">synthesis — a conclusion the cited works do not individually state</span>
                        <Markdown md={c.md} math={c.hasMath} />
                      </div>
                    );
                  }
                  return <Fragment key={i}><Markdown md={c.md} math={c.hasMath} /></Fragment>;
                })}
              </section>
            ))}
            <p className="mt-10 text-sm bx-muted no-print">
              <button type="button" className="bx-btn !py-0.5 mr-2" onClick={() => window.print()}>Print the guide</button>
              {notepad.state.notes.length > 0 && <button type="button" className="bx-btn !py-0.5 mr-2" onClick={() => void printWithNotes()}>Print with my notes</button>}
              <br className="sm:hidden" />
              End of the guide. <Link className="underline" to="/">The pathfinder →</Link> · <Link className="underline" to="/routes">All routes →</Link> · <Link className="underline" to="/references">All {provenance.references.total.toLocaleString()} references →</Link> · <Link className="underline" to="/methods">How this was built and what it does not cover →</Link>
            </p>
          </article>
          {printNotes && (
            <section className="bx-print-notes mt-10" aria-label="My notes">
              <h2 className="text-2xl">My notes</h2>
              {printNotes.map((g) => (
                <div key={g.key} className="mt-4">
                  <h3 className="text-lg">{g.title}</h3>
                  {g.notes.map((n) => <div key={n.id} className="mt-2 text-sm">{n.quote && <blockquote className="border-l-2 pl-2 italic">{n.quote}</blockquote>}<p className="whitespace-pre-wrap">{n.body}</p></div>)}
                </div>
              ))}
            </section>
          )}
        </div>
        {notepad.open && wide && (
          <aside className="bx-notepad-dock" aria-label="Notepad">
            <div className="sticky top-20 h-[calc(100vh-6rem)] bx-card p-3"><Suspense fallback={null}><NotepadPanel section={active} onClose={() => notepad.setOpen(false)} /></Suspense></div>
          </aside>
        )}
      </div>
      {notepad.open && !wide && (
        <Drawer open onClose={() => notepad.setOpen(false)} label="Notepad" testId="notepad-drawer">
          <Suspense fallback={null}><NotepadPanel section={active} /></Suspense>
        </Drawer>
      )}
      {!notepad.open && (
        <button type="button" className="bx-btn-primary fixed bottom-4 right-4 z-40 shadow-lg no-print" onClick={() => notepad.setOpen(true)} aria-label="Open notepad">✎ Notes</button>
      )}
      {sel && (
        <button type="button" className="bx-btn-primary absolute z-40 -translate-x-1/2 -translate-y-full shadow-lg no-print" style={{ left: sel.x, top: sel.y }} onMouseDown={(e) => e.preventDefault()} onClick={addNote} data-testid="add-note">Add note</button>
      )}
    </div>
  );
}
