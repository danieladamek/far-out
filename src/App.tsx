import { Suspense, lazy } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Layout from '@/components/Layout';
import { ThemeProvider } from '@/lib/theme';
import { NotepadProvider } from '@/lib/notepad-context';
import { TermDrawerProvider } from '@/components/ui/TermDrawer';
import Home from '@/pages/Home';
import NotFound from '@/pages/NotFound';

// Route-level code splitting keeps each surface light; KaTeX, the chart library and the search index load only where used.
const RoutesPage = lazy(() => import('@/pages/Routes'));
const RoutePage = lazy(() => import('@/pages/RoutePage'));
const ProgramPage = lazy(() => import('@/pages/ProgramPage'));
const Programs = lazy(() => import('@/pages/Programs'));
const Status = lazy(() => import('@/pages/Status'));
const Gates = lazy(() => import('@/pages/Gates'));
const Buyers = lazy(() => import('@/pages/Buyers'));
const Help = lazy(() => import('@/pages/Help'));
const Primes = lazy(() => import('@/pages/Primes'));
const How = lazy(() => import('@/pages/How'));
const Changes = lazy(() => import('@/pages/Changes'));
const Find = lazy(() => import('@/pages/Find'));
const Partners = lazy(() => import('@/pages/Partners'));
const Read = lazy(() => import('@/pages/Read'));
const Glossary = lazy(() => import('@/pages/Glossary'));
const Concepts = lazy(() => import('@/pages/Concepts'));
const Concept = lazy(() => import('@/pages/Concept'));
const Notes = lazy(() => import('@/pages/Notes'));
const Figures = lazy(() => import('@/pages/Figures'));
const Figure = lazy(() => import('@/pages/Figure'));
const References = lazy(() => import('@/pages/References'));
const Methods = lazy(() => import('@/pages/Methods'));
const About = lazy(() => import('@/pages/About'));

const basename = import.meta.env.BASE_URL.replace(/\/$/, '');

export default function App() {
  return (
    <ThemeProvider>
      <NotepadProvider>
        <BrowserRouter basename={basename}>
          <TermDrawerProvider>
            <Layout>
              <Suspense fallback={<div className="mx-auto max-w-3xl px-4 py-12 bx-muted min-h-[80vh]" role="status">Loading…</div>}>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/routes" element={<RoutesPage />} />
                  <Route path="/routes/:id" element={<RoutePage />} />
                  <Route path="/programs" element={<Programs />} />
                  <Route path="/programs/:id" element={<ProgramPage />} />
                  <Route path="/status" element={<Status />} />
                  <Route path="/gates" element={<Gates />} />
                  <Route path="/buyers" element={<Buyers />} />
                  <Route path="/help" element={<Help />} />
                  <Route path="/primes" element={<Primes />} />
                  <Route path="/how" element={<How />} />
                  <Route path="/changes" element={<Changes />} />
                  <Route path="/find" element={<Find />} />
                  <Route path="/partners" element={<Partners />} />
                  <Route path="/read" element={<Read />} />
                  <Route path="/glossary" element={<Glossary />} />
                  <Route path="/concepts" element={<Concepts />} />
                  <Route path="/concepts/:id" element={<Concept />} />
                  <Route path="/notes" element={<Notes />} />
                  <Route path="/figures" element={<Figures />} />
                  <Route path="/figures/:id" element={<Figure />} />
                  <Route path="/references" element={<References />} />
                  <Route path="/methods" element={<Methods />} />
                  <Route path="/about" element={<About />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </Layout>
          </TermDrawerProvider>
        </BrowserRouter>
      </NotepadProvider>
    </ThemeProvider>
  );
}
