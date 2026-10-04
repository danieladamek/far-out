import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useTheme } from '@/lib/theme';
import { useNotepad } from '@/lib/notepad-context';
import { AS_OF, manifest } from '@/lib/data';
import Drawer from '@/components/ui/Drawer';
const SearchModal = lazy(() => import('./SearchModal'));
const NotepadPanel = lazy(() => import('./notepad/NotepadPanel'));

/** Every surface, linked from the header (APP-SPEC §8). Two groups: the catalogue and the guide. */
export const NAV_WORK = [
  { to: '/routes', label: 'Routes' },
  { to: '/programs', label: 'Programs' },
  { to: '/status', label: 'Status' },
  { to: '/gates', label: 'Gates' },
  { to: '/buyers', label: 'Buyers' },
  { to: '/help', label: 'Help' },
  { to: '/primes', label: 'Primes' },
  { to: '/how', label: 'How' },
  { to: '/changes', label: 'Changes' },
  { to: '/find', label: 'Find' },
  { to: '/partners', label: 'Partners' },
];
export const NAV_GUIDE = [
  { to: '/read', label: 'Read' },
  { to: '/glossary', label: 'Glossary' },
  { to: '/concepts', label: 'Concepts' },
  { to: '/figures', label: 'Figures' },
  { to: '/references', label: 'References' },
  { to: '/notes', label: 'Notes' },
  { to: '/methods', label: 'Methods' },
  { to: '/about', label: 'About' },
];
export const NAV = [...NAV_WORK, ...NAV_GUIDE];

const linkCls = ({ isActive }: { isActive: boolean }) => `rounded-md px-2 py-1 hover:bg-paper-2 dark:hover:bg-night-2 ${isActive ? 'font-semibold underline underline-offset-4' : ''}`;

export default function Layout({ children }: { children: ReactNode }) {
  const { theme, toggle } = useTheme();
  const notepad = useNotepad();
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const loc = useLocation();
  useEffect(() => { setOpen(false); }, [loc.pathname]);
  useEffect(() => {
    // Move focus to main on route change for keyboard/screen-reader users; keep hash navigation intact.
    const main = document.getElementById('main');
    if (main && loc.key !== 'default' && !loc.hash && !loc.search) { main.focus({ preventScroll: true }); window.scrollTo({ top: 0 }); }
  }, [loc.pathname, loc.key, loc.hash, loc.search]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearchOpen((o) => !o); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const onRead = loc.pathname === '/read';
  const onNotes = loc.pathname === '/notes';

  return (
    <div className="min-h-screen flex flex-col">
      <a href="#main" className="sr-only-focusable fixed left-2 top-2 z-[80] rounded bg-ink px-3 py-2 text-paper">Skip to content</a>
      <header className="sticky top-0 z-40 border-b border-[color:var(--bx-line)] bg-paper/90 dark:bg-night/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-3 sm:px-4 py-2">
          <Link to="/" className="font-display text-xl font-semibold tracking-tight whitespace-nowrap" aria-label="FAR Out — home">FAR <span className="bx-muted font-normal">Out</span></Link>
          <span className="hidden md:inline bx-asof ml-1" title="The date the sweep of public sources closed">as of {AS_OF}</span>
          <div className="ml-auto flex shrink-0 items-center gap-1">
            <button type="button" className="bx-btn !px-2 sm:!px-2.5" onClick={() => setSearchOpen(true)} aria-label="Search (Command K)" title="Search ⌘K"><span aria-hidden="true">⌕</span><span className="hidden sm:inline">Search</span><kbd className="bx-kbd hidden md:inline" aria-hidden="true">⌘K</kbd></button>
            <button type="button" onClick={toggle} className="bx-btn !px-2 sm:!px-2.5" aria-pressed={theme === 'dark'} aria-label={`${theme === 'dark' ? 'Dark' : 'Light'} theme — switch to ${theme === 'dark' ? 'light' : 'dark'} theme`} title="Toggle light/dark theme" data-testid="theme-toggle">
              <span aria-hidden="true">{theme === 'dark' ? '☾' : '☼'}</span><span className="hidden sm:inline">{theme === 'dark' ? 'Dark' : 'Light'}</span>
            </button>
            {!onNotes && <button type="button" className={`bx-btn !px-2 sm:!px-2.5 ${notepad.open ? 'bx-btn-on' : ''}`} onClick={notepad.toggle} aria-pressed={notepad.open} aria-label="Notepad — toggle" title="Notepad" data-testid="notepad-toggle"><span aria-hidden="true">✎</span><span className="hidden sm:inline">Notepad</span></button>}
            <button type="button" className="bx-btn !px-2 xl:hidden" aria-expanded={open} aria-controls="mobile-nav" aria-label="Menu" onClick={() => setOpen((o) => !o)}><span aria-hidden="true">☰</span><span className="hidden sm:inline">Menu</span></button>
          </div>
        </div>
        <nav aria-label="Primary" className="hidden xl:block border-t border-[color:var(--bx-line)]">
          <div className="mx-auto flex max-w-7xl items-center gap-0.5 px-3 py-1 text-sm">
            {NAV_WORK.map((n) => <NavLink key={n.to} to={n.to} className={linkCls}>{n.label}</NavLink>)}
            <span className="mx-2 h-4 w-px bg-[color:var(--bx-line)]" aria-hidden="true" />
            {NAV_GUIDE.map((n) => <NavLink key={n.to} to={n.to} className={linkCls}>{n.label}</NavLink>)}
          </div>
        </nav>
        {open && (
          <nav id="mobile-nav" aria-label="Primary mobile" className="xl:hidden border-t border-[color:var(--bx-line)] px-4 py-2 text-sm">
            <p className="text-[11px] font-semibold tracking-[0.15em] bx-muted mt-1">THE CATALOGUE</p>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 mt-1">{NAV_WORK.map((n) => <NavLink key={n.to} to={n.to} className={({ isActive }) => `rounded-md px-2 py-2 ${isActive ? 'font-semibold underline underline-offset-4' : ''}`}>{n.label}</NavLink>)}</div>
            <p className="text-[11px] font-semibold tracking-[0.15em] bx-muted mt-2">THE GUIDE</p>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 mt-1">{NAV_GUIDE.map((n) => <NavLink key={n.to} to={n.to} className={({ isActive }) => `rounded-md px-2 py-2 ${isActive ? 'font-semibold underline underline-offset-4' : ''}`}>{n.label}</NavLink>)}</div>
          </nav>
        )}
      </header>
      <main id="main" tabIndex={-1} className="flex-1 outline-none min-h-screen">{children}</main>
      {searchOpen && <Suspense fallback={null}><SearchModal open onClose={() => setSearchOpen(false)} /></Suspense>}
      {!onRead && !onNotes && (
        <Drawer open={notepad.open} onClose={() => notepad.setOpen(false)} label="Notepad" testId="notepad-drawer">
          <Suspense fallback={<p className="bx-muted">Loading…</p>}><NotepadPanel /></Suspense>
        </Drawer>
      )}
      <footer className="border-t border-[color:var(--bx-line)] mt-12">
        <div className="mx-auto max-w-7xl px-4 py-6 text-sm bx-muted grid gap-2">
          <p data-testid="footer-disclaimer"><strong>{manifest.disclaimer}</strong> Current as of <span data-testid="footer-asof">{AS_OF}</span>.</p>
          <p>
            FAR Out is a commissioned guide written by an AI research builder ({manifest.builder.name} {manifest.builder.version}) from public government
            sources — not peer reviewed, not official, no affiliation with any firm or agency. See <Link className="underline" to="/methods">Methods</Link> and <Link className="underline" to="/about">About</Link>.
            Your answers, notes and saved searches stay in this browser.
          </p>
        </div>
      </footer>
    </div>
  );
}
