#!/usr/bin/env node
// Build the small offline harvest used by Playwright (and `npm run harvest:fixture`) by running the
// real harvest scripts over the unit-test fixtures, so the format can never drift from the real one.
// Usage: node scripts/harvest/make-fixture.mjs [outDir=tests/fixtures/opportunities]
import { spawnSync } from 'node:child_process';
import { rm, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', '..');
const fx = join(root, 'tests', 'fixtures', 'harvest');
const outDir = resolve(process.argv[2] || join(root, 'tests', 'fixtures', 'opportunities'));
// Fixed clock: the fixture CSV's dates are written relative to this day.
const TODAY = '2026-10-04';
const env = { ...process.env, HARVEST_AT: `${TODAY}T09:17:00.000Z` };

for (const p of ['manifest.json', 'sam', 'grants']) await rm(join(outDir, p), { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

const run = (script, args) => {
  const r = spawnSync(process.execPath, [join(here, script), outDir, ...args], { stdio: 'inherit', env });
  if (r.status !== 0) { console.error(`[fixture] ${script} failed (exit ${r.status})`); process.exit(1); }
};
run('sam.mjs', ['--file', join(fx, 'sam-50.csv'), '--today', TODAY]);
run('grants.mjs', ['--fixture', `${join(fx, 'grants-5.json')},${join(fx, 'grants-page2.json')}`, '--fixture-elig', `23=${join(fx, 'grants-elig23.json')}`]);
console.log(`[fixture] wrote ${outDir}`);
