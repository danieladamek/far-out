import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type MiniSearch from 'minisearch';
import { assetUrl, SLUG } from '@/lib/data';
import savedJson from '@/data/saved-searches.json';
import type { FindFilter } from '@/types';
import { findHref } from '@/lib/find-link';
import { matchesFilters, normaliseGrants, normaliseSam, type Opp, type FindState } from '@/lib/find';

/** Pack URLs for the feeds this site links to but does not harvest (references/mechanics in the pack). */
const LINKS = {
  sam: 'https://sam.gov/content/opportunities',
  grants: 'https://www.grants.gov/search-grants',
  sbir: 'https://www.sbir.gov/topics',
  dod: 'https://www.dodsbirsttr.mil/topics-app/',
};
const PROFILE_KEY = `${SLUG}:find-profile`;
interface Profile { naics: string[]; keywords: string[] }
interface Manifest { harvestedAt: string; sources: Record<string, { ok: boolean; count: number; harvestedAt: string; status?: number; stale?: boolean }>; counts: Record<string, number>; failures: { source: string; status: number | null; message: string; at: string }[]; notes?: string[] }
interface Shard { columns: string[]; rows: unknown[][] }

function loadProfile(): Profile {
  try { const p = JSON.parse(localStorage.getItem(PROFILE_KEY) ?? '{}') as Partial<Profile>; return { naics: p.naics ?? [], keywords: p.keywords ?? [] }; } catch { return { naics: [], keywords: [] }; }
}
const getJson = async <T,>(rel: string): Promise<T> => { const r = await fetch(assetUrl(rel)); if (!r.ok) throw new Error(`${rel}: ${r.status}`); return (await r.json()) as T; };
const split = (s: string | null) => (s ? s.split('|').filter(Boolean) : []);
const PAGE = 50;

/**
 * `/find` — the opportunity search (KICKOFF §4b). Client-side over this site's own daily harvest of the public
 * SAM.gov extract and the Grants.gov search API (public/data/opportunities/). Every result links out to its
 * SAM.gov or Grants.gov page; nothing is proxied. With no harvest present it says so and offers the deep links.
 */
export default function Find() {
  const [params, setParams] = useSearchParams();
  const [manifest, setManifest] = useState<Manifest | null | undefined>(undefined);
  const [opps, setOpps] = useState<Opp[]>([]);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [index, setIndex] = useState<MiniSearch<Opp> | null>(null);
  const [profile, setProfile] = useState<Profile>(loadProfile);
  const [shown, setShown] = useState(PAGE);

  // filter state lives in the URL so a saved search is a link
  const state: FindState = {
    q: params.get('q') ?? '',
    feed: (params.get('feed') as FindState['feed']) ?? '',
    any: split(params.get('any')),
    types: split(params.get('type')),
    setAside: params.get('setaside') ?? '',
    naics: split(params.get('naics')),
    agency: params.get('agency') ?? '',
    deadlineDays: params.get('due') ?? '',
    postedDays: params.get('posted') ?? '',
    sbir: params.get('sbir') === '1',
  };
  const set = (k: string, v: string) => { const p = new URLSearchParams(params); if (v) p.set(k, v); else p.delete(k); if (k !== 'saved' && k !== 'label') { p.delete('saved'); p.delete('label'); } setParams(p, { replace: true }); };
  const savedLabel = params.get('label');

  // load: manifest → SAM index → shards (progressively) + grants
  useEffect(() => {
    let live = true;
    (async () => {
      let m: Manifest;
      try { m = await getJson<Manifest>('data/opportunities/manifest.json'); } catch { if (live) setManifest(null); return; }
      if (!live) return;
      setManifest(m);
      const jobs: Promise<void>[] = [];
      const add = (xs: Opp[]) => { if (live) setOpps((o) => o.concat(xs)); };
      let files: string[] = [];
      try { const idx = await getJson<{ files: { file: string }[] }>('data/opportunities/sam/index.json'); files = idx.files.map((f) => f.file); } catch { /* SAM missing: grants only */ }
      setProgress({ done: 0, total: files.length + 1 });
      const tick = () => { if (live) setProgress((p) => ({ ...p, done: p.done + 1 })); };
      for (const f of files) jobs.push(getJson<Shard>(`data/opportunities/${f}`).then((s) => add(normaliseSam(s))).catch(() => undefined).finally(tick));
      jobs.push(getJson<Shard>('data/opportunities/grants/all.json').then((s) => add(normaliseGrants(s))).catch(() => undefined).finally(tick));
      await Promise.all(jobs);
    })();
    return () => { live = false; };
  }, []);

  // full-text index for the keyword box, built without blocking the page
  const building = useRef(false);
  useEffect(() => {
    if (!manifest || progress.total === 0 || progress.done < progress.total || building.current) return;
    building.current = true;
    void import('minisearch').then(({ default: MS }) => {
      const ms = new MS<Opp>({ idField: 'key', fields: ['title', 'agency', 'desc', 'number'], storeFields: [], searchOptions: { prefix: true, combineWith: 'AND', boost: { title: 2 } } });
      return ms.addAllAsync(opps, { chunkSize: 500 }).then(() => setIndex(ms));
    });
  }, [manifest, progress, opps]);

  const dq = useDeferredValue(state.q);
  const results = useMemo(() => {
    let base = opps;
    let order: Map<string, number> | null = null;
    if (dq.trim()) {
      if (index) { const hits = index.search(dq); order = new Map(hits.map((h, i) => [String(h.id), i])); base = opps.filter((o) => order!.has(o.key)); }
      else { const words = dq.toLowerCase().split(/\s+/).filter(Boolean); base = opps.filter((o) => words.every((w) => o.hay.includes(w))); }
    }
    const today = new Date().toISOString().slice(0, 10);
    const out = base.filter((o) => matchesFilters(o, { ...state, q: '' }, today));
    if (order) out.sort((a, b) => order!.get(a.key)! - order!.get(b.key)!);
    else out.sort((a, b) => (a.deadline || '9999').localeCompare(b.deadline || '9999'));
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opps, index, dq, params]);
  useEffect(() => { setShown(PAGE); }, [params]);

  const types = useMemo(() => [...new Set(opps.map((o) => o.type).filter(Boolean))].sort(), [opps]);
  const setAsides = useMemo(() => { const m = new Map<string, string>(); for (const o of opps) if (o.setAsideCode && o.setAsideCode !== 'NONE') m.set(o.setAsideCode, o.setAside); return [...m.entries()].sort(); }, [opps]);
  const agencies = useMemo(() => [...new Set(opps.map((o) => o.agency).filter(Boolean))].sort(), [opps]);
  const saved = (savedJson as { id: string; name: string; find_filter: FindFilter }[]).filter((r) => r.find_filter.feed !== 'none');

  const saveProfile = (p: Profile) => { setProfile(p); try { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); } catch { /* blocked */ } };
  const [naicsDraft, setNaicsDraft] = useState('');
  const [kwDraft, setKwDraft] = useState('');

  const stale = manifest?.failures?.map((f) => f.source) ?? [];
  const loading = manifest === undefined || (manifest && progress.done < progress.total);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl sm:text-4xl">Find opportunities</h1>
      <div className="bx-card p-3 mt-3 text-sm grid gap-1 min-h-[9rem]" data-testid="find-about">
        {manifest === undefined && <p className="bx-muted" role="status">Loading this site's copy of the public feeds…</p>}
        {manifest ? (
          <p>Searching this site's own copy of the public feeds, harvested <strong data-testid="harvest-date">{new Date(manifest.harvestedAt).toISOString().slice(0, 16).replace('T', ' ')} UTC</strong>: <strong data-testid="count-sam">{(manifest.counts.sam ?? 0).toLocaleString()}</strong> SAM.gov notices and <strong data-testid="count-grants">{(manifest.counts.grants ?? 0).toLocaleString()}</strong> Grants.gov opportunities. Notices are up to a day old.</p>
        ) : null}
        <p className="bx-muted">The SAM.gov data is the public daily contract-opportunities extract; the Grants.gov data is its public search API (posted and forecasted). <a className="underline" href={LINKS.sbir} target="_blank" rel="noreferrer">SBIR.gov topics</a> and the <a className="underline" href={LINKS.dod} target="_blank" rel="noreferrer">DoD SBIR/STTR topics portal</a> are linked but not harvested. When this page loads it fetches only those files from this site; searches run in this browser and nothing is sent anywhere.</p>
        {stale.length > 0 && <p className="bx-todo !rounded-md !block !py-1" data-testid="stale-feed">The last harvest failed for {stale.join(' and ')} ({manifest!.failures.map((f) => `${f.source}: ${f.status ?? 'no response'} — ${f.message}`).join('; ')}); {stale.join(' and ')} results may be stale or missing.</p>}
      </div>

      {manifest === null && (
        <div className="bx-card p-4 mt-4 border-l-4 border-l-amber-500" data-testid="find-degraded">
          <p className="font-semibold">This copy of the site has no harvested opportunity data.</p>
          <p className="text-sm mt-1">The data is built into the published site each day; a local build without a harvest has none. The feeds themselves are here:</p>
          <ul className="list-disc pl-5 text-sm mt-2 grid gap-1">
            <li><a className="underline" href={LINKS.sam} target="_blank" rel="noreferrer">SAM.gov contract opportunities ↗</a></li>
            <li><a className="underline" href={LINKS.grants} target="_blank" rel="noreferrer">Grants.gov search ↗</a></li>
            <li><a className="underline" href={LINKS.sbir} target="_blank" rel="noreferrer">SBIR.gov topics ↗</a></li>
            <li><a className="underline" href={LINKS.dod} target="_blank" rel="noreferrer">DoD SBIR/STTR topics ↗</a></li>
          </ul>
        </div>
      )}

      {manifest && (
        <>
          <section className="mt-4" aria-labelledby="saved-h">
            <h2 id="saved-h" className="text-lg">Saved searches</h2>
            <p className="text-xs bx-muted">From the routes and programs that carry one in the pack, and the firm's own codes and words below.</p>
            <div className="mt-2 flex flex-wrap gap-1.5 text-sm">
              {saved.map((r) => <Link key={r.id} className={`bx-btn !py-0.5 ${params.get('saved') === r.id ? 'bx-btn-on' : ''}`} to={findHref(r.find_filter!, r.name, r.id)} data-testid={`saved-${r.id}`}>{r.name.length > 60 ? `${r.name.slice(0, 58)}…` : r.name}</Link>)}
              {profile.naics.length > 0 && <button type="button" className="bx-btn !py-0.5" onClick={() => setParams({ naics: profile.naics.join('|'), label: 'The firm’s NAICS codes' }, { replace: true })} data-testid="saved-my-naics">The firm's NAICS codes</button>}
              {profile.keywords.length > 0 && <button type="button" className="bx-btn !py-0.5" onClick={() => setParams({ any: profile.keywords.join('|'), label: 'The firm’s keywords' }, { replace: true })} data-testid="saved-my-keywords">The firm's keywords</button>}
            </div>
            <details className="mt-2 text-sm">
              <summary className="cursor-pointer bx-muted">The firm's own NAICS codes and keywords (stay in this browser)</summary>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <div>
                  <label htmlFor="my-naics" className="block text-xs bx-muted mb-1">NAICS codes or prefixes</label>
                  <div className="flex gap-1"><input id="my-naics" className="bx-input" value={naicsDraft} onChange={(e) => setNaicsDraft(e.target.value)} placeholder="e.g. 5415" /><button type="button" className="bx-btn" onClick={() => { const v = naicsDraft.replace(/\D/g, ''); if (v) saveProfile({ ...profile, naics: [...new Set([...profile.naics, v])] }); setNaicsDraft(''); }}>Add</button></div>
                  <p className="mt-1 flex flex-wrap gap-1">{profile.naics.map((n) => <button key={n} type="button" className="bx-chip bg-paper-2 dark:bg-night-2" onClick={() => saveProfile({ ...profile, naics: profile.naics.filter((x) => x !== n) })} aria-label={`Remove NAICS ${n}`}>{n} ×</button>)}</p>
                </div>
                <div>
                  <label htmlFor="my-kw" className="block text-xs bx-muted mb-1">Keywords</label>
                  <div className="flex gap-1"><input id="my-kw" className="bx-input" value={kwDraft} onChange={(e) => setKwDraft(e.target.value)} /><button type="button" className="bx-btn" onClick={() => { const v = kwDraft.trim(); if (v) saveProfile({ ...profile, keywords: [...new Set([...profile.keywords, v])] }); setKwDraft(''); }}>Add</button></div>
                  <p className="mt-1 flex flex-wrap gap-1">{profile.keywords.map((k) => <button key={k} type="button" className="bx-chip bg-paper-2 dark:bg-night-2" onClick={() => saveProfile({ ...profile, keywords: profile.keywords.filter((x) => x !== k) })} aria-label={`Remove keyword ${k}`}>{k} ×</button>)}</p>
                </div>
              </div>
              <p className="text-xs bx-muted mt-1">Stays in this browser only; nothing is sent anywhere.</p>
            </details>
          </section>

          <div className="bx-card p-3 mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 text-sm" role="search" aria-label="Filter opportunities">
            <label className="block lg:col-span-2"><span className="block text-xs bx-muted mb-1">Keyword (title, agency, description excerpt)</span>
              <input className="bx-input" type="search" value={state.q} onChange={(e) => set('q', e.target.value)} placeholder="e.g. cybersecurity training" data-testid="find-q" /></label>
            <label className="block"><span className="block text-xs bx-muted mb-1">Feed</span>
              <select className="bx-input" value={state.feed} onChange={(e) => set('feed', e.target.value)} data-testid="find-feed"><option value="">Both</option><option value="sam">SAM.gov contracts</option><option value="grants">Grants.gov</option></select></label>
            <label className="flex items-end gap-2 pb-1.5"><input type="checkbox" checked={state.sbir} onChange={(e) => set('sbir', e.target.checked ? '1' : '')} data-testid="find-sbir" /><span>SBIR/STTR in the title only</span></label>
            <label className="block"><span className="block text-xs bx-muted mb-1">Notice type</span>
              <select className="bx-input" value={state.types.length === 1 ? state.types[0] : state.types.length ? '__saved' : ''} onChange={(e) => set('type', e.target.value === '__saved' ? params.get('type') ?? '' : e.target.value)}>
                <option value="">Any type</option>{state.types.length > 1 && <option value="__saved">{state.types.join(' / ')}</option>}{types.map((t) => <option key={t} value={t}>{t}</option>)}</select></label>
            <label className="block"><span className="block text-xs bx-muted mb-1">Set-aside code</span>
              <select className="bx-input" value={state.setAside} onChange={(e) => set('setaside', e.target.value)}><option value="">Any</option>{setAsides.map(([c, l]) => <option key={c} value={c}>{c} — {l.slice(0, 50)}</option>)}</select></label>
            <label className="block"><span className="block text-xs bx-muted mb-1">NAICS prefix</span>
              <input className="bx-input" inputMode="numeric" value={state.naics.join('|')} onChange={(e) => set('naics', e.target.value.replace(/[^\d|]/g, ''))} placeholder="e.g. 54 or 541512" /></label>
            <label className="block"><span className="block text-xs bx-muted mb-1">Agency</span>
              <input className="bx-input" list="agency-list" value={state.agency} onChange={(e) => set('agency', e.target.value)} /><datalist id="agency-list">{agencies.slice(0, 400).map((a) => <option key={a} value={a} />)}</datalist></label>
            <label className="block"><span className="block text-xs bx-muted mb-1">Response deadline within</span>
              <select className="bx-input" value={state.deadlineDays} onChange={(e) => set('due', e.target.value)}><option value="">Any time</option><option value="7">7 days</option><option value="30">30 days</option><option value="90">90 days</option></select></label>
            <label className="block"><span className="block text-xs bx-muted mb-1">Posted within</span>
              <select className="bx-input" value={state.postedDays} onChange={(e) => set('posted', e.target.value)}><option value="">Any time</option><option value="1">1 day</option><option value="7">7 days</option><option value="30">30 days</option></select></label>
          </div>

          <p className="mt-3 text-sm bx-muted" role="status" aria-live="polite" data-testid="find-status">
            {loading ? `Loading the harvest… ${progress.done} of ${progress.total || '…'} files` : `${results.length.toLocaleString()} result${results.length === 1 ? '' : 's'}`}
            {savedLabel && <> · saved search: <strong>{savedLabel}</strong>{state.any.length > 0 && <> (any of: {state.any.map((a) => `“${a}”`).join(', ')})</>}</>}
            {[...params.keys()].length > 0 && <> · <button type="button" className="underline" onClick={() => setParams({}, { replace: true })}>clear all filters</button></>}
          </p>

          <ol className="mt-3 grid gap-2" data-testid="find-results">
            {results.slice(0, shown).map((o) => (
              <li key={o.key} className="bx-card p-3 text-sm" data-testid="find-result">
                <a className="font-semibold underline" href={o.link} target="_blank" rel="noreferrer">{o.title} ↗</a>
                <p className="text-xs bx-muted mt-0.5">{o.agency}{o.office ? ` · ${o.office}` : ''}</p>
                <p className="mt-1 flex flex-wrap gap-1 text-xs">
                  <span className="bx-chip bg-paper-2 dark:bg-night-2">{o.feed === 'sam' ? 'SAM.gov' : 'Grants.gov'}</span>
                  {o.type && <span className="bx-chip border border-[color:var(--bx-line)]">{o.type}</span>}
                  {o.setAsideCode && o.setAsideCode !== 'NONE' && <span className="bx-chip border border-[color:var(--bx-line)]" title={o.setAside}>{o.setAsideCode}</span>}
                  {o.naics && <span className="bx-chip border border-[color:var(--bx-line)]">NAICS {o.naics}</span>}
                  {o.sbir && <span className="bx-chip border border-[color:var(--bx-line)] font-bold">SBIR/STTR</span>}
                  {o.posted && <span className="bx-muted">posted {o.posted}</span>}
                  <span className="bx-muted">· {o.deadline ? `due ${o.deadline}` : 'no deadline listed'}</span>
                </p>
                {o.desc && <p className="mt-1 text-xs bx-muted line-clamp-2">{o.desc}</p>}
              </li>
            ))}
          </ol>
          {results.length > shown && <p className="mt-3"><button type="button" className="bx-btn" onClick={() => setShown((s) => s + PAGE)}>Show {Math.min(PAGE, results.length - shown)} more</button></p>}
        </>
      )}
    </div>
  );
}
