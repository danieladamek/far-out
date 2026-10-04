import { useMemo, useState, type FormEvent } from 'react';
import { loadMechanics, useAsync } from '@/lib/heavy';

const API = 'https://api.usaspending.gov/api/v2';
const CONTRACTS = ['A', 'B', 'C', 'D'];
const iso = (d: Date) => d.toISOString().slice(0, 10);

interface Recipient { amount: number; recipient_id: string | null; name: string; uei?: string | null }
interface SubRow { 'Sub-Award ID': string; 'Sub-Awardee Name': string; 'Sub-Award Date': string; 'Sub-Award Amount': number; 'Awarding Agency': string; 'Prime Award ID': string; 'Prime Recipient Name': string; prime_award_recipient_id?: string | null; sub_award_recipient_id?: string | null }
interface Result { recipients: Recipient[]; counts: Record<string, number>; subs: SubRow[]; messages: string[] }

/** POST to USAspending; responses are kept in sessionStorage for this tab, keyed by the request. */
async function post<T>(path: string, body: unknown): Promise<T> {
  const key = `usaspending:${path}:${JSON.stringify(body)}`;
  try { const hit = sessionStorage.getItem(key); if (hit) return JSON.parse(hit) as T; } catch { /* no session storage */ }
  const r = await fetch(`${API}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`USAspending answered ${r.status}`);
  const j = (await r.json()) as T;
  try { sessionStorage.setItem(key, JSON.stringify(j)); } catch { /* full */ }
  return j;
}
const money = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const profile = (id?: string | null) => (id ? `https://www.usaspending.gov/recipient/${id}/latest` : undefined);

/**
 * `/partners` — who wins and who subcontracts, by NAICS code, from live USAspending queries (KICKOFF §4b). The only
 * page that sends anything out of the browser: the form's values go to api.usaspending.gov and nowhere else.
 */
export default function Partners() {
  const mech = useAsync(loadMechanics);
  const setAsideCodes = useMemo(() => {
    const m = mech?.find((x) => (x as { set_aside_codes?: unknown }).set_aside_codes);
    const codes = ((m?.set_aside_codes as { codes?: unknown[] } | undefined)?.codes ?? []).filter((c): c is string => typeof c === 'string');
    return codes;
  }, [mech]);
  const today = new Date();
  const [naics, setNaics] = useState('');
  const [state, setState] = useState('');
  const [setAside, setSetAside] = useState('');
  const [start, setStart] = useState(iso(new Date(today.getTime() - 365 * 86400000)));
  const [end, setEnd] = useState(iso(today));
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'done'>('idle');
  const [error, setError] = useState('');
  const [res, setRes] = useState<Result | null>(null);

  const run = async (e: FormEvent) => {
    e.preventDefault();
    const code = naics.trim();
    if (!/^\d{2,6}$/.test(code)) { setStatus('error'); setError('Enter a NAICS code of 2 to 6 digits.'); return; }
    const filters: Record<string, unknown> = { naics_codes: { require: [code] }, time_period: [{ start_date: start, end_date: end }], award_type_codes: CONTRACTS };
    if (state) filters.recipient_locations = [{ country: 'USA', state: state.toUpperCase() }];
    if (setAside) filters.set_aside_type_codes = [setAside];
    setStatus('loading'); setError('');
    try {
      const [cat, count, subs] = await Promise.all([
        post<{ results: Recipient[]; messages?: string[] }>('/search/spending_by_category/recipient/', { filters, limit: 25, page: 1 }),
        post<{ results: Record<string, number>; messages?: string[] }>('/search/spending_by_award_count/', { filters: { ...filters, award_type_codes: undefined } }),
        post<{ results: SubRow[]; messages?: string[] }>('/search/spending_by_award/', {
          subawards: true, filters, limit: 50, page: 1, sort: 'Sub-Award Amount', order: 'desc',
          fields: ['Sub-Award ID', 'Sub-Awardee Name', 'Sub-Award Date', 'Sub-Award Amount', 'Awarding Agency', 'Prime Award ID', 'Prime Recipient Name', 'prime_award_recipient_id', 'sub_award_recipient_id'],
        }),
      ]);
      const messages = [...new Set([...(cat.messages ?? []), ...(count.messages ?? []), ...(subs.messages ?? [])])];
      setRes({ recipients: cat.results ?? [], counts: count.results ?? {}, subs: subs.results ?? [], messages });
      setStatus('done');
    } catch (err) {
      setStatus('error');
      setError(`The request to USAspending did not succeed (${(err as Error).message || 'network error'}).`);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-3xl sm:text-4xl">Partners: who wins and who subcontracts</h1>
      <div className="bx-card p-3 mt-3 text-sm border-l-4 border-l-[color:var(--bx-accent)]" data-testid="partners-notice">
        <p><strong>This page queries USAspending live.</strong> When the form is submitted, the NAICS code, state, set-aside code and dates go to <code>api.usaspending.gov</code>, the federal spending site's public API, and nowhere else; nothing else is sent. Answers are kept for this browser tab only.</p>
      </div>
      <form className="bx-card p-3 mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5 text-sm items-end" onSubmit={run} aria-label="USAspending query">
        <label className="block"><span className="block text-xs bx-muted mb-1">NAICS code (required)</span><input className="bx-input" inputMode="numeric" required value={naics} onChange={(e) => setNaics(e.target.value)} placeholder="e.g. 541512" data-testid="partners-naics" /></label>
        <label className="block"><span className="block text-xs bx-muted mb-1">State (optional, 2 letters)</span><input className="bx-input" maxLength={2} value={state} onChange={(e) => setState(e.target.value.replace(/[^a-z]/gi, ''))} placeholder="e.g. VA" /></label>
        <label className="block"><span className="block text-xs bx-muted mb-1">Set-aside type (optional)</span><select className="bx-input" value={setAside} onChange={(e) => setSetAside(e.target.value)}><option value="">Any</option>{setAsideCodes.map((c) => <option key={c} value={c}>{c}</option>)}</select></label>
        <label className="block"><span className="block text-xs bx-muted mb-1">From</span><input className="bx-input" type="date" value={start} onChange={(e) => setStart(e.target.value)} /></label>
        <label className="block"><span className="block text-xs bx-muted mb-1">To</span><input className="bx-input" type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></label>
        <div className="sm:col-span-2 lg:col-span-5"><button type="submit" className="bx-btn-primary" disabled={status === 'loading'} data-testid="partners-run">{status === 'loading' ? 'Asking USAspending…' : 'Query USAspending'}</button></div>
      </form>

      {status === 'error' && (
        <p className="bx-card p-3 mt-4 text-sm" role="alert" data-testid="partners-error">{error} The same data is on <a className="underline" href="https://www.usaspending.gov/search" target="_blank" rel="noreferrer">usaspending.gov/search ↗</a>, where the filters can be set by hand.</p>
      )}

      {status === 'done' && res && (
        <div className="mt-6 grid gap-8" data-testid="partners-results">
          <section aria-labelledby="rec-h">
            <h2 id="rec-h" className="text-2xl">Top recipients by obligation</h2>
            <p className="text-sm bx-muted mt-1">Contract award counts for this filter, as USAspending returns them: {Object.entries(res.counts).filter(([, v]) => v > 0).map(([k, v]) => `${k} ${v.toLocaleString()}`).join(' · ') || 'none'}.</p>
            {res.recipients.length === 0 ? <p className="mt-2 text-sm">No recipients for this filter.</p> : (
              <div className="overflow-x-auto mt-2"><table className="bx-table" data-testid="recipients-table">
                <thead><tr><th scope="col">#</th><th scope="col">Recipient</th><th scope="col">UEI</th><th scope="col" className="text-right">Obligated</th></tr></thead>
                <tbody>{res.recipients.map((r, i) => <tr key={`${r.recipient_id}-${i}`}><td className="tabular-nums">{i + 1}</td><td>{profile(r.recipient_id) ? <a className="underline" href={profile(r.recipient_id)} target="_blank" rel="noreferrer">{r.name} ↗</a> : r.name}</td><td className="font-mono text-xs">{r.uei ?? '—'}</td><td className="text-right tabular-nums">{money(r.amount)}</td></tr>)}</tbody>
              </table></div>
            )}
          </section>
          <section aria-labelledby="sub-h">
            <h2 id="sub-h" className="text-2xl">Subawards: prime recipient → subawardee</h2>
            <p className="text-sm bx-muted mt-1">Largest subawards reported under prime contracts matching the filter. Subaward data is reported by prime contractors to USAspending; the API's own notes on this answer, including any caveat about completeness, are below as it returned them.</p>
            {res.subs.length === 0 ? <p className="mt-2 text-sm">No subawards reported for this filter.</p> : (
              <div className="overflow-x-auto mt-2"><table className="bx-table" data-testid="subawards-table">
                <thead><tr><th scope="col">Prime recipient</th><th scope="col">Subawardee</th><th scope="col">Agency</th><th scope="col">Date</th><th scope="col" className="text-right">Amount</th></tr></thead>
                <tbody>{res.subs.map((s, i) => (
                  <tr key={`${s['Sub-Award ID']}-${i}`}>
                    <td>{profile(s.prime_award_recipient_id) ? <a className="underline" href={profile(s.prime_award_recipient_id)} target="_blank" rel="noreferrer">{s['Prime Recipient Name']} ↗</a> : s['Prime Recipient Name']}<span className="block text-xs bx-muted">{s['Prime Award ID']}</span></td>
                    <td>{profile(s.sub_award_recipient_id) ? <a className="underline" href={profile(s.sub_award_recipient_id)} target="_blank" rel="noreferrer">{s['Sub-Awardee Name']} ↗</a> : s['Sub-Awardee Name']}</td>
                    <td>{s['Awarding Agency']}</td><td className="whitespace-nowrap">{s['Sub-Award Date']}</td><td className="text-right tabular-nums">{money(s['Sub-Award Amount'])}</td>
                  </tr>
                ))}</tbody>
              </table></div>
            )}
          </section>
          {res.messages.length > 0 && (
            <section aria-labelledby="msg-h" data-testid="api-messages">
              <h2 id="msg-h" className="text-lg">USAspending's own notes on this answer</h2>
              <ul className="list-disc pl-5 text-sm bx-muted mt-1 grid gap-1">{res.messages.map((m, i) => <li key={i}>{m}</li>)}</ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
