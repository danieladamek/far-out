#!/usr/bin/env node
// Harvest posted + forecasted opportunities from Grants.gov search2 (no key), sequentially and politely.
// Writes public/data/opportunities/grants/all.json and merges into manifest.json.
// search2 hits carry no eligibility codes, so two extra eligibility-filtered queries
// (23 = Small businesses, 99 = Unrestricted) tag which hits list those codes.
//
// Usage: node scripts/harvest/grants.mjs [outDir]
//        node scripts/harvest/grants.mjs [outDir] --fixture page1.json[,page2.json…] [--fixture-elig 23=elig23.json[,99=…]]
//        (offline: the files are saved search2 responses; used by make-fixture.mjs)
import { readFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { GRANTS_URL, GRANTS_COLUMNS, USER_AGENT, mapGrantsHits, grantsHitsHaveEligibilities, toRow, writeJson, readJson, mergeManifest } from './lib.mjs';

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args.splice(i, 2)[1] : undefined; };
const fixture = opt('--fixture');
const fixtureElig = opt('--fixture-elig');
const outDir = resolve(args[0] || 'public/data/opportunities');

const PAGE = 500;
const DELAY_MS = 750;
const MAX_PAGES = 40; // safety stop (20k hits)
const ELIGIBILITY_CODES = { 23: 'Small businesses', 99: 'Unrestricted' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let lastStatus = null;
async function search2(body) {
  const res = await fetch(GRANTS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'User-Agent': USER_AGENT },
    body: JSON.stringify({ keyword: '', oppStatuses: 'posted|forecasted', ...body }),
  });
  lastStatus = res.status;
  const text = await res.text();
  if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status} ${res.statusText}: ${text.slice(0, 200)}`), { status: res.status });
  let json;
  try { json = JSON.parse(text); } catch { throw Object.assign(new Error(`non-JSON response: ${text.slice(0, 200)}`), { status: res.status }); }
  if (json.errorcode && json.errorcode !== 0) throw Object.assign(new Error(`search2 errorcode ${json.errorcode}: ${json.msg}`), { status: res.status });
  return json;
}

/** Page through one query; returns all raw hits and the hitCount. */
async function pageAll(extra = {}) {
  const hits = [];
  let hitCount = Infinity;
  let pages = 0;
  for (let start = 0; start < hitCount && pages < MAX_PAGES; start += PAGE) {
    if (pages) await sleep(DELAY_MS);
    const json = await search2({ rows: PAGE, startRecordNum: start, ...extra });
    pages++;
    hitCount = json.data?.hitCount ?? 0;
    const batch = json.data?.oppHits ?? [];
    hits.push(...batch);
    if (!batch.length) break;
  }
  return { hits, hitCount, pages };
}

async function harvestGrants() {
  const t0 = Date.now();
  const at = process.env.HARVEST_AT || new Date().toISOString(); // HARVEST_AT pins it for fixtures
  const manifestPath = join(outDir, 'manifest.json');
  try {
    let json;
    let pages = 0;
    let hitCount = 0;
    const eligibleIds = {};
    const notes = [];
    if (fixture) {
      const pagesJson = await Promise.all(fixture.split(',').map(async (f) => JSON.parse(await readFile(f, 'utf8'))));
      hitCount = pagesJson[0]?.data?.hitCount ?? 0;
      json = { data: { hitCount, oppHits: pagesJson.flatMap((p) => p.data?.oppHits ?? []) } };
      pages = pagesJson.length;
      lastStatus = 200;
      for (const pair of (fixtureElig || '').split(',').filter(Boolean)) {
        const [code, file] = pair.split('=');
        const e = JSON.parse(await readFile(file, 'utf8'));
        eligibleIds[code] = new Set((e.data?.oppHits ?? []).map((h) => String(h.id)));
        pages++;
      }
      notes.push(`offline fixture (${pages} saved search2 responses)`);
      if (Object.keys(eligibleIds).length) notes.push(`"eligibilities" lists only codes ${Object.keys(eligibleIds).join(', ')}, from eligibility-filtered responses`);
    } else {
      const main = await pageAll();
      pages = main.pages;
      hitCount = main.hitCount;
      json = { data: { hitCount, oppHits: main.hits } };
      if (main.hits.length < hitCount) throw Object.assign(new Error(`got ${main.hits.length} of ${hitCount} hits after ${pages} pages`), { status: lastStatus });
      if (!grantsHitsHaveEligibilities(json)) {
        for (const code of Object.keys(ELIGIBILITY_CODES)) {
          await sleep(DELAY_MS);
          const q = await pageAll({ eligibilities: code });
          pages += q.pages;
          eligibleIds[code] = new Set(q.hits.map((h) => String(h.id)));
        }
        notes.push(`search2 hits carry no eligibility codes; "eligibilities" lists only ${Object.entries(ELIGIBILITY_CODES).map(([c, l]) => `${c} (${l})`).join(' and ')}, from eligibility-filtered queries — [] means neither code, not "unknown eligibility"`);
      }
    }
    const records = mapGrantsHits(json, { eligibleIds });
    // de-duplicate (paging over a live index can repeat a hit)
    const seen = new Set();
    const uniq = records.filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)));
    uniq.sort((a, b) => (b.openDate || '').localeCompare(a.openDate || '') || a.id.localeCompare(b.id));
    const body = {
      columns: GRANTS_COLUMNS,
      rows: uniq.map((r) => toRow(r, GRANTS_COLUMNS)),
      harvestedAt: at,
      source: GRANTS_URL,
      hitCount,
      eligibilityCodesProbed: Object.keys(eligibleIds),
      notes,
    };
    await mkdir(join(outDir, 'grants'), { recursive: true });
    const bytes = await writeJson(join(outDir, 'grants', 'all.json'), body);
    const ms = Date.now() - t0;
    const byStatus = uniq.reduce((a, r) => ((a[r.oppStatus] = (a[r.oppStatus] || 0) + 1), a), {});
    notes.push(`hitCount ${hitCount}, ${uniq.length} kept (${Object.entries(byStatus).map(([k, v]) => `${k} ${v}`).join(', ')}), ${pages} requests, ${(bytes / 1024).toFixed(0)} KB`);
    const manifest = mergeManifest(await readJson(manifestPath, null), 'grants', { ok: true, url: GRANTS_URL, at, count: uniq.length, ms, status: lastStatus }, notes);
    await writeJson(manifestPath, manifest);
    console.log(`[grants] ok: hitCount ${hitCount}, kept ${uniq.length}, sbir ${uniq.filter((r) => r.sbir).length}, ${pages} requests, ${bytes} B, ${ms} ms`);
    return { ok: true };
  } catch (e) {
    const st = e?.status ?? lastStatus ?? null;
    console.error(`[grants] FAILED (status ${st ?? 'n/a'}): ${e?.message || e}`);
    await mkdir(outDir, { recursive: true });
    const manifest = mergeManifest(await readJson(manifestPath, null), 'grants', { ok: false, url: GRANTS_URL, at, ms: Date.now() - t0, status: st, message: String(e?.message || e) });
    await writeJson(manifestPath, manifest);
    return { ok: false };
  }
}

const r = await harvestGrants();
process.exitCode = r.ok ? 0 : 1;
