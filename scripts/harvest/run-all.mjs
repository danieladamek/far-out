#!/usr/bin/env node
// Run the SAM harvest, then the Grants harvest; keep going after a failure; exit 1 if either failed.
// Usage: node scripts/harvest/run-all.mjs [outDir]
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const extra = process.argv.slice(2);
const failed = [];
for (const name of ['sam', 'grants']) {
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [join(here, `${name}.mjs`), ...extra], { stdio: 'inherit' });
  const ok = r.status === 0;
  console.log(`[harvest] ${name}: ${ok ? 'ok' : `FAILED (exit ${r.status ?? r.signal})`} in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  if (!ok) failed.push(name);
}
if (failed.length) {
  console.error(`[harvest] failed sources: ${failed.join(', ')} — see failures[] in manifest.json`);
  process.exitCode = 1;
}
