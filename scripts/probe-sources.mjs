// Probe the public opportunity feeds FAR Out would harvest. Read-only; prints a JSON report.
const UA = 'far-out-probe (github.com/danieladamek/far-out)';
const out = { ranAt: new Date().toISOString() };

async function probe(name, url, init = {}, parse) {
  const t0 = Date.now();
  try {
    const r = await fetch(url, { ...init, headers: { 'User-Agent': UA, Accept: 'application/json, text/csv, */*', ...(init.headers || {}) } });
    const text = await r.text();
    const rec = { status: r.status, ms: Date.now() - t0, bytes: text.length, contentType: r.headers.get('content-type') };
    if (parse) Object.assign(rec, parse(text, r));
    out[name] = rec;
  } catch (e) { out[name] = { error: String(e), ms: Date.now() - t0 }; }
}
const j = (t) => { try { return JSON.parse(t); } catch { return null; } };

// SBIR.gov — solicitations (all agencies), DoD only, and awards
await probe('sbir_open', 'https://api.www.sbir.gov/public/api/solicitations?open=1&rows=50', {}, (t) => { const d = j(t); return Array.isArray(d) ? { records: d.length, agencies: [...new Set(d.map(x => x.agency))], titles: d.slice(0, 3).map(x => x.solicitation_title), topicsInFirst: d[0]?.solicitation_topics?.length } : { raw: t.slice(0, 300) }; });
await probe('sbir_open_dod', 'https://api.www.sbir.gov/public/api/solicitations?open=1&agency=DOW&rows=50', {}, (t) => { const d = j(t); return Array.isArray(d) ? { records: d.length } : { raw: t.slice(0, 300) }; });
await probe('sbir_open_dod_legacy', 'https://api.www.sbir.gov/public/api/solicitations?open=1&agency=DOD&rows=50', {}, (t) => { const d = j(t); return Array.isArray(d) ? { records: d.length } : { raw: t.slice(0, 300) }; });
await probe('sbir_awards', 'https://api.www.sbir.gov/public/api/awards?year=2026&rows=5', {}, (t) => { const d = j(t); return Array.isArray(d) ? { records: d.length, keys: Object.keys(d[0] || {}) } : { raw: t.slice(0, 300) }; });

// Grants.gov — legacy search2 (no key)
await probe('grants_search2', 'https://api.grants.gov/v1/api/search2', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ keyword: '', oppStatuses: 'posted|forecasted', rows: 1 }) }, (t) => { const d = j(t); return { hitCount: d?.data?.hitCount, errorcode: d?.errorcode }; });

// SAM.gov — public daily CSV of contract opportunities (headers only; no download)
await probe('sam_csv_head', 'https://s3.amazonaws.com/falextracts/Contract%20Opportunities/datagov/ContractOpportunitiesFullCSV.csv', { method: 'HEAD' }, (t, r) => ({ contentLength: r.headers.get('content-length'), lastModified: r.headers.get('last-modified') }));
await probe('sam_csv_range', 'https://s3.amazonaws.com/falextracts/Contract%20Opportunities/datagov/ContractOpportunitiesFullCSV.csv', { headers: { Range: 'bytes=0-2047' } }, (t, r) => ({ contentRange: r.headers.get('content-range'), header: t.split('\n')[0].slice(0, 200) }));

// USAspending — set-aside contract count, last 30 days
const end = new Date(); const start = new Date(end.getTime() - 30 * 86400000);
const iso = (d) => d.toISOString().slice(0, 10);
await probe('usaspending_count', 'https://api.usaspending.gov/api/v2/search/spending_by_award_count/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filters: { award_type_codes: ['A', 'B', 'C', 'D'], time_period: [{ start_date: iso(start), end_date: iso(end) }], set_aside_type_codes: ['SBA'] } }) }, (t) => ({ contracts: j(t)?.results?.contracts }));

// A probe passes on any 2xx (206 included, for the ranged GET); anything else, or a network error, fails the run.
const passed = (v) => v && !v.error && typeof v.status === 'number' && v.status >= 200 && v.status < 300;
const failedProbes = Object.entries(out).filter(([k, v]) => k !== 'ranAt' && !passed(v)).map(([k]) => k);
out.failed = failedProbes;
const report = JSON.stringify(out, null, 2);
console.log(report);
await (await import('node:fs/promises')).writeFile('probe-results.json', report);
if (process.env.GITHUB_STEP_SUMMARY) {
  const rows = Object.entries(out).filter(([k]) => k !== 'ranAt' && k !== 'failed').map(([k, v]) => `| ${k} | ${passed(v) ? 'ok' : '**FAIL**'} | ${v.status ?? 'ERR'} | ${v.ms} | ${v.error ?? v.records ?? v.hitCount ?? v.contracts ?? v.contentLength ?? ''} |`).join('\n');
  await (await import('node:fs/promises')).appendFile(process.env.GITHUB_STEP_SUMMARY, `## Source probe ${out.ranAt}\n\n| source | result | status | ms | note |\n|---|---|---|---|---|\n${rows}\n\n${failedProbes.length ? `**Failed:** ${failedProbes.join(', ')}` : 'All probes returned 2xx.'}\n`);
}
if (failedProbes.length) {
  console.error(`probe failures: ${failedProbes.join(', ')}`);
  process.exitCode = 1;
}
