#!/usr/bin/env node
// Harvest the public SAM.gov Contract Opportunities daily extract (~210 MB CSV), streaming.
// Writes public/data/opportunities/sam/<sector>.json shards + sam/index.json and merges
// its result into public/data/opportunities/manifest.json. Exit 1 on failure, leaving the
// previous SAM output and the Grants output untouched.
//
// Usage: node scripts/harvest/sam.mjs [outDir] [--file local.csv] [--today YYYY-MM-DD]
import { Readable } from 'node:stream';
import { createReadStream } from 'node:fs';
import { rm, mkdir, rename, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { SAM_URL, SAM_COLUMNS, USER_AGENT, parseSamCsvStream, shardBySector, writeJson, readJson, mergeManifest, todayIso } from './lib.mjs';

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args.splice(i, 2)[1] : undefined; };
const localFile = opt('--file');
const today = opt('--today') || todayIso();
const outDir = resolve(args[0] || 'public/data/opportunities');

async function harvestSam({ outDir, localFile, today }) {
  const t0 = Date.now();
  const at = process.env.HARVEST_AT || new Date().toISOString(); // HARVEST_AT pins it for fixtures
  const url = localFile ? `file:${localFile}` : SAM_URL;
  let status = null;
  let downloaded = 0;
  try {
    let body;
    if (localFile) {
      body = createReadStream(localFile);
    } else {
      const res = await fetch(SAM_URL, { headers: { 'User-Agent': USER_AGENT } });
      status = res.status;
      if (!res.ok || !res.body) throw Object.assign(new Error(`HTTP ${res.status} ${res.statusText}`), { status: res.status });
      body = Readable.fromWeb(res.body);
    }
    body.on('data', (c) => { downloaded += c.length; });
    const parsed = await parseSamCsvStream(body, { today });
    if (localFile) status = 200; // offline run: no HTTP; record 200 only once the file parsed
    const missing = ['NoticeId', 'Title', 'Active', 'ResponseDeadLine', 'PostedDate', 'Type', 'NaicsCode', 'Description'].filter((h) => !parsed.header.includes(h));
    if (missing.length) throw Object.assign(new Error(`CSV header changed; missing ${missing.join(', ')}`), { status });
    if (parsed.read === 0) throw Object.assign(new Error('CSV had no data rows'), { status });

    const { files, bySector } = shardBySector(parsed.records);
    // Write into a fresh temp dir, then swap, so a crash never leaves half a shard set.
    const tmp = join(outDir, `.sam-tmp-${process.pid}`);
    await rm(tmp, { recursive: true, force: true });
    await mkdir(tmp, { recursive: true });
    let bytes = 0;
    for (const f of files) {
      f.bytes = await writeJson(join(tmp, f.file.replace(/^sam\//, '')), f.body);
      bytes += f.bytes;
    }
    const index = {
      harvestedAt: at,
      source: SAM_URL,
      today,
      total: parsed.kept,
      read: parsed.read,
      malformed: parsed.malformed,
      columns: SAM_COLUMNS,
      files: files.map(({ file, sector, count, bytes }) => ({ file, sector, count, bytes })),
      bySector,
      byType: parsed.byType,
      sbir: parsed.records.filter((r) => r.sbir).length,
      filter: 'Active == Yes AND (ResponseDeadLine empty OR ≥ today−1 OR (Type ∈ {Sources Sought, Presolicitation, Special Notice} AND posted within 120 days))',
    };
    bytes += await writeJson(join(tmp, 'index.json'), index);
    const final = join(outDir, 'sam');
    const old = join(outDir, `.sam-old-${process.pid}`);
    await rename(final, old).catch(() => {});
    await rename(tmp, final);
    await rm(old, { recursive: true, force: true });

    const ms = Date.now() - t0;
    const maxShard = Math.max(0, ...files.map((f) => f.bytes));
    const manifestPath = join(outDir, 'manifest.json');
    const manifest = mergeManifest(await readJson(manifestPath, null), 'sam', { ok: true, url: SAM_URL, at, count: parsed.kept, ms, bytes, status }, [
      `read ${parsed.read} rows (${(downloaded / 1e6).toFixed(1)} MB), kept ${parsed.kept}; ${files.length} shard files, largest ${(maxShard / 1024).toFixed(0)} KB`,
      'link is the public notice page https://sam.gov/opp/<NoticeId>/view',
    ]);
    await writeJson(manifestPath, manifest);
    console.log(`[sam] ok: read ${parsed.read}, kept ${parsed.kept}, malformed ${parsed.malformed}, ${files.length} files, max shard ${maxShard} B, total ${bytes} B, ${(downloaded / 1e6).toFixed(1)} MB in, ${ms} ms`);
    return { ok: true };
  } catch (e) {
    const ms = Date.now() - t0;
    const st = e?.status ?? status ?? null;
    console.error(`[sam] FAILED (status ${st ?? 'n/a'}): ${e?.message || e}`);
    const manifestPath = join(outDir, 'manifest.json');
    await mkdir(outDir, { recursive: true });
    const manifest = mergeManifest(await readJson(manifestPath, null), 'sam', { ok: false, url, at, ms, status: st, message: String(e?.message || e) });
    await writeJson(manifestPath, manifest);
    // clean stray temp dirs from this run
    for (const d of await readdir(outDir).catch(() => [])) if (d.startsWith(`.sam-tmp-${process.pid}`)) await rm(join(outDir, d), { recursive: true, force: true });
    return { ok: false };
  }
}

const r = await harvestSam({ outDir, localFile, today });
process.exitCode = r.ok ? 0 : 1;
