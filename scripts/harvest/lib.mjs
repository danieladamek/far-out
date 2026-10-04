// Shared pure helpers for the FAR Out opportunity harvest (SAM.gov CSV + Grants.gov search2).
// No network here: everything takes data in and returns data out, so Vitest can drive it.
import { Transform } from 'node:stream';
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { dirname } from 'node:path';

export const SAM_URL = 'https://s3.amazonaws.com/falextracts/Contract%20Opportunities/datagov/ContractOpportunitiesFullCSV.csv';
export const GRANTS_URL = 'https://api.grants.gov/v1/api/search2';
export const USER_AGENT = 'far-out-harvest (github.com/danieladamek/far-out)';

/** Slim SAM record columns, in row order. */
export const SAM_COLUMNS = ['id', 'title', 'sol', 'agency', 'subtier', 'office', 'posted', 'type', 'setAsideCode', 'setAside', 'deadline', 'naics', 'psc', 'popState', 'link', 'descExcerpt', 'sbir'];
/** Slim Grants.gov record columns, in row order. */
export const GRANTS_COLUMNS = ['id', 'number', 'title', 'agency', 'agencyCode', 'openDate', 'closeDate', 'oppStatus', 'docType', 'cfdaList', 'eligibilities', 'sbir'];

/** Notice types kept for 120 days after posting even when their response deadline has passed. */
export const EARLY_NOTICE_TYPES = new Set(['Sources Sought', 'Presolicitation', 'Special Notice']);
export const EARLY_NOTICE_WINDOW_DAYS = 120;
export const EXCERPT_CHARS = 400;
export const SHARD_MAX_BYTES = 1.5 * 1024 * 1024;

const SBIR_RE = /\bS[BT]IR\b|\bSTTR\b/i;
/** @param {string|null|undefined} title */
export const isSbir = (title) => SBIR_RE.test(title || '');

// ---------------------------------------------------------------- dates

/**
 * Normalise a date-ish string to ISO `YYYY-MM-DD`, dropping time and zone.
 * Handles `2026-10-03 06:33:33`, `2026-10-16T15:00:00-07:00`, `2026-10-07`, `10/16/2026`.
 * Returns '' for empty/unparseable input.
 * @param {string|null|undefined} s
 */
export function isoDate(s) {
  if (!s) return '';
  const t = String(s).trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(t);
  if (m) return `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
  return '';
}

/** @param {string} iso YYYY-MM-DD @param {number} days */
export function addDays(iso, days) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Today as YYYY-MM-DD (UTC). */
export const todayIso = () => new Date().toISOString().slice(0, 10);

// ---------------------------------------------------------------- text decoding

const CP1252_HIGH = '€�‚ƒ„…†‡ˆ‰Š‹Œ�Ž��‘’“”•–—˜™š›œ�žŸ';
const cp1252 = (b) => (b >= 0x80 && b <= 0x9f ? CP1252_HIGH[b - 0x80] : String.fromCharCode(b));

/** Length of a valid UTF-8 sequence starting at i (2..4), 0 if not valid, -1 if truncated at buffer end. */
function utf8SeqLen(buf, i) {
  const b = buf[i];
  const n = b >= 0xc2 && b <= 0xdf ? 2 : b >= 0xe0 && b <= 0xef ? 3 : b >= 0xf0 && b <= 0xf4 ? 4 : 0;
  if (!n) return 0;
  for (let k = 1; k < n; k++) {
    if (i + k >= buf.length) return -1;
    if ((buf[i + k] & 0xc0) !== 0x80) return 0;
  }
  return n;
}

/**
 * Decode bytes that are mostly Windows-1252 but contain some valid UTF-8 sequences
 * (the SAM extract is exactly this mix). Valid UTF-8 multibyte runs decode as UTF-8,
 * every other high byte as Windows-1252. Returns the decoded text and the number of
 * trailing bytes left undecoded because a UTF-8 sequence may continue in the next chunk.
 * @param {Uint8Array} buf @param {boolean} [final]
 * @returns {{ text: string, rest: number }}
 */
export function decodeMixed(buf, final = true) {
  let out = '';
  let start = 0; // start of pending ASCII run
  let i = 0;
  while (i < buf.length) {
    const b = buf[i];
    if (b < 0x80) { i++; continue; }
    if (i > start) out += Buffer.from(buf.buffer, buf.byteOffset + start, i - start).toString('latin1');
    const n = utf8SeqLen(buf, i);
    if (n === -1 && !final) return { text: out, rest: buf.length - i };
    if (n > 0) { out += Buffer.from(buf.buffer, buf.byteOffset + i, n).toString('utf8'); i += n; }
    else { out += cp1252(b); i++; }
    start = i;
  }
  if (i > start) out += Buffer.from(buf.buffer, buf.byteOffset + start, i - start).toString('latin1');
  return { text: out, rest: 0 };
}

/** Transform stream: bytes (mixed Windows-1252 / UTF-8) → UTF-8 strings. */
export function mixedDecoderStream() {
  let carry = Buffer.alloc(0);
  return new Transform({
    readableObjectMode: false,
    transform(chunk, _enc, cb) {
      const buf = carry.length ? Buffer.concat([carry, chunk]) : chunk;
      const { text, rest } = decodeMixed(buf, false);
      carry = rest ? Buffer.from(buf.subarray(buf.length - rest)) : Buffer.alloc(0);
      cb(null, text);
    },
    flush(cb) {
      cb(null, carry.length ? decodeMixed(carry, true).text : '');
    },
  });
}

// ---------------------------------------------------------------- SAM rows

/** Collapse whitespace, strip markup, cut to EXCERPT_CHARS. @param {string} s */
export function excerpt(s, n = EXCERPT_CHARS) {
  const t = String(s || '')
    .replace(/<[^>]{0,200}>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (t.length <= n) return t;
  return t.slice(0, n - 1).trimEnd() + '…';
}

/**
 * Keep rule (KICKOFF §4c): Active == Yes AND ( deadline empty OR deadline ≥ today − 1
 * OR (type ∈ {Sources Sought, Presolicitation, Special Notice} AND posted within 120 days) ).
 * @param {Record<string,string>} row raw CSV row keyed by header
 * @param {{ today: string }} opts
 */
export function keepSamRow(row, { today }) {
  if ((row.Active || '').trim() !== 'Yes') return false;
  const deadline = isoDate(row.ResponseDeadLine);
  if (!deadline) return true;
  if (deadline >= addDays(today, -1)) return true;
  if (EARLY_NOTICE_TYPES.has((row.Type || '').trim())) {
    const posted = isoDate(row.PostedDate);
    if (posted && posted >= addDays(today, -EARLY_NOTICE_WINDOW_DAYS)) return true;
  }
  return false;
}

/** Public notice URL. The CSV's `Link` points at /workspace/… (sign-in); the public view is /opp/<id>/view. */
export function samLink(row) {
  const id = (row.NoticeId || '').trim();
  if (id) return `https://sam.gov/opp/${id}/view`;
  return (row.Link || '').trim();
}

/**
 * Raw CSV row → slim record object (keys = SAM_COLUMNS).
 * @param {Record<string,string>} row
 */
export function slimSamRow(row) {
  const t = (k) => (row[k] ?? '').trim();
  return {
    id: t('NoticeId'),
    title: t('Title'),
    sol: t('Sol#'),
    agency: t('Department/Ind.Agency'),
    subtier: t('Sub-Tier'),
    office: t('Office'),
    posted: isoDate(row.PostedDate),
    type: t('Type'),
    setAsideCode: t('SetASideCode'),
    setAside: t('SetASide'),
    deadline: isoDate(row.ResponseDeadLine),
    naics: t('NaicsCode'),
    psc: t('ClassificationCode'),
    popState: t('PopState'),
    link: samLink(row),
    descExcerpt: excerpt(row.Description),
    sbir: isSbir(row.Title),
  };
}

/** NAICS two-digit sector, or 'none'. @param {string} naics */
export const naicsSector = (naics) => (/^\d{2}/.test(naics || '') ? naics.slice(0, 2) : 'none');

/** Record object → array row in column order. */
export const toRow = (rec, columns) => columns.map((c) => rec[c]);

/**
 * Streaming RFC 4180 CSV reader: yields one string[] per record from an async iterable of text chunks.
 * Handles quoted fields with embedded commas, doubled quotes, LF/CRLF newlines; pulls chunks on demand,
 * so the producer is back-pressured and only the current record is held in memory.
 * @param {AsyncIterable<string|Buffer>} chunks
 * @returns {AsyncGenerator<string[]>}
 */
export async function* csvRecords(chunks) {
  let field = '';
  let row = [];
  let inQuotes = false;
  let quotePending = false; // saw a '"' inside quotes; next char decides: '"' = literal, else end of quotes
  let sawAny = false;
  for await (const c of chunks) {
    const s = typeof c === 'string' ? c : c.toString('utf8');
    let i = 0;
    const n = s.length;
    while (i < n) {
      if (inQuotes) {
        if (quotePending) {
          quotePending = false;
          if (s[i] === '"') { field += '"'; i++; continue; }
          inQuotes = false; // fall through to unquoted handling of s[i]
        } else {
          const q = s.indexOf('"', i);
          if (q < 0) { field += s.slice(i); i = n; continue; }
          field += s.slice(i, q);
          i = q + 1;
          quotePending = true;
          continue;
        }
      }
      const ch = s[i];
      if (ch === '"' && field === '') { inQuotes = true; sawAny = true; i++; continue; }
      if (ch === ',') { row.push(field); field = ''; sawAny = true; i++; continue; }
      if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && s[i + 1] === '\n') i++;
        i++;
        if (sawAny || field !== '' || row.length) { row.push(field); yield row; }
        row = []; field = ''; sawAny = false;
        continue;
      }
      // plain run up to the next special char
      let j = i;
      while (j < n && s[j] !== ',' && s[j] !== '\n' && s[j] !== '\r' && !(s[j] === '"' && j === i && field === '')) j++;
      field += s.slice(i, j === i ? i + 1 : j);
      sawAny = true;
      i = j === i ? i + 1 : j;
    }
  }
  if (sawAny || field !== '' || row.length) { row.push(field); yield row; }
}

/**
 * Stream-parse the SAM CSV. Never holds the raw file; holds only the kept slim records.
 * @param {NodeJS.ReadableStream} readable byte stream (Windows-1252/UTF-8 mix; pass decode:false for a string stream)
 * @param {{ today?: string, decode?: boolean }} [opts]
 */
export async function parseSamCsvStream(readable, { today = todayIso(), decode = true } = {}) {
  const records = [];
  const byType = {};
  let header = null;
  let read = 0;
  let malformed = 0;
  const src = decode ? readable.pipe(mixedDecoderStream()) : readable;
  if (decode) readable.on('error', (e) => src.destroy(e));
  for await (const cells of csvRecords(src)) {
    if (!header) { header = cells.map((h, k) => (k === 0 ? h.replace(/^\uFEFF/, '') : h).trim()); continue; }
    read++;
    if (cells.length !== header.length) { malformed++; continue; }
    const row = {};
    for (let k = 0; k < header.length; k++) row[header[k]] = cells[k];
    if (!keepSamRow(row, { today })) continue;
    // JSON round-trip copies the strings: V8 slices would otherwise pin every 64 KB source chunk in memory.
    const rec = JSON.parse(JSON.stringify(slimSamRow(row)));
    records.push(rec);
    byType[rec.type] = (byType[rec.type] || 0) + 1;
  }
  return { header: header || [], read, kept: records.length, malformed, records, byType };
}

/**
 * Shard slim records by NAICS sector into `{ columns, rows }` files ≤ maxBytes each.
 * A sector that fits is one file `<sector>.json`; one that does not is split into
 * `<sector>-1.json`, `<sector>-2.json`, …  Rows are sorted posted-desc, then id.
 * @param {object[]} records @param {{ maxBytes?: number, prefix?: string }} [opts]
 * @returns {{ files: { file: string, sector: string, count: number, bytes: number, body: { columns: string[], rows: any[][] } }[], bySector: Record<string, number> }}
 */
export function shardBySector(records, { maxBytes = SHARD_MAX_BYTES, prefix = 'sam/' } = {}) {
  const groups = new Map();
  for (const r of records) {
    const s = naicsSector(r.naics);
    if (!groups.has(s)) groups.set(s, []);
    groups.get(s).push(r);
  }
  const sectors = [...groups.keys()].sort((a, b) => (a === 'none' ? 1 : b === 'none' ? -1 : a.localeCompare(b)));
  const files = [];
  const bySector = {};
  const overhead = Buffer.byteLength(JSON.stringify({ columns: SAM_COLUMNS, rows: [] }));
  for (const s of sectors) {
    const recs = groups.get(s).sort((a, b) => (b.posted || '').localeCompare(a.posted || '') || a.id.localeCompare(b.id));
    bySector[s] = recs.length;
    const parts = [];
    let cur = [];
    let bytes = overhead;
    for (const r of recs) {
      const row = toRow(r, SAM_COLUMNS);
      const b = Buffer.byteLength(JSON.stringify(row)) + 1;
      if (cur.length && bytes + b > maxBytes) { parts.push({ rows: cur, bytes }); cur = []; bytes = overhead; }
      cur.push(row);
      bytes += b;
    }
    if (cur.length) parts.push({ rows: cur, bytes });
    parts.forEach((p, i) => {
      const name = parts.length === 1 ? `${s}.json` : `${s}-${i + 1}.json`;
      files.push({ file: `${prefix}${name}`, sector: s, count: p.rows.length, bytes: p.bytes, body: { columns: SAM_COLUMNS, rows: p.rows } });
    });
  }
  return { files, bySector };
}

// ---------------------------------------------------------------- Grants.gov

/**
 * search2 response JSON → slim records. search2 hits carry no eligibility codes;
 * pass `eligibleIds` (code → Set of hit ids from eligibility-filtered queries) to fill them.
 * @param {any} json search2 response
 * @param {{ eligibleIds?: Record<string, Set<string>> }} [opts]
 */
export function mapGrantsHits(json, { eligibleIds = {} } = {}) {
  const hits = json?.data?.oppHits;
  if (!Array.isArray(hits)) throw new Error(`search2: no data.oppHits (errorcode ${json?.errorcode ?? '?'}: ${json?.msg ?? ''})`);
  return hits.map((h) => {
    const id = String(h.id ?? '');
    const elig = Array.isArray(h.eligibilities)
      ? h.eligibilities.map((e) => String(e?.value ?? e))
      : Object.keys(eligibleIds).filter((code) => eligibleIds[code].has(id)).sort();
    return {
      id,
      number: h.number ?? '',
      title: h.title ?? '',
      agency: h.agency ?? '',
      agencyCode: h.agencyCode ?? '',
      openDate: isoDate(h.openDate),
      closeDate: isoDate(h.closeDate),
      oppStatus: h.oppStatus ?? '',
      docType: h.docType ?? '',
      cfdaList: Array.isArray(h.cfdaList) ? h.cfdaList.map(String) : [],
      eligibilities: elig,
      sbir: isSbir(h.title),
    };
  });
}

/** True when search2 hits carry eligibility codes themselves. */
export const grantsHitsHaveEligibilities = (json) => (json?.data?.oppHits || []).some((h) => 'eligibilities' in h);

// ---------------------------------------------------------------- manifest

export function emptyManifest() {
  return { harvestedAt: null, sources: {}, counts: { sam: 0, grants: 0 }, failures: [], notes: [] };
}

/** Read a JSON file, or return fallback when missing/corrupt. */
export async function readJson(path, fallback) {
  try { return JSON.parse(await readFile(path, 'utf8')); } catch { return fallback; }
}

/** Atomic-ish JSON write (tmp + rename). */
export async function writeJson(path, data) {
  await mkdir(dirname(path), { recursive: true });
  const tmp = `${path}.tmp-${process.pid}`;
  await writeFile(tmp, JSON.stringify(data));
  await rename(tmp, path);
  return Buffer.byteLength(JSON.stringify(data));
}

/**
 * Merge one source's result into the shared manifest, leaving the other source alone.
 * On failure the previous `sources[name]` (and its count) is kept, marked ok:false/stale,
 * and a failure entry is appended; failures for this source from earlier runs are replaced.
 * @param {any} manifest existing manifest (or null)
 * @param {'sam'|'grants'} name
 * @param {{ ok: boolean, url: string, at: string, count?: number, ms: number, bytes?: number, status: number|null, message?: string }} r
 * @param {string[]} [notes] notes for this source (replace that source's earlier notes)
 */
export function mergeManifest(manifest, name, r, notes = []) {
  const m = { ...emptyManifest(), ...(manifest || {}) };
  m.sources = { ...(m.sources || {}) };
  m.counts = { sam: 0, grants: 0, ...(m.counts || {}) };
  const prev = m.sources[name];
  if (r.ok) {
    const src = { ok: true, url: r.url, harvestedAt: r.at, count: r.count ?? 0, ms: r.ms, status: r.status };
    if (r.bytes !== undefined) src.bytes = r.bytes;
    m.sources[name] = src;
    m.counts[name] = src.count;
  } else {
    m.sources[name] = prev
      ? { ...prev, ok: false, stale: true, status: r.status, lastAttemptAt: r.at }
      : { ok: false, url: r.url, harvestedAt: null, count: 0, ms: r.ms, status: r.status, lastAttemptAt: r.at };
    m.counts[name] = prev?.count ?? 0;
  }
  m.failures = (m.failures || []).filter((f) => f.source !== name);
  if (!r.ok) m.failures.push({ source: name, status: r.status, message: r.message || 'failed', at: r.at });
  const tag = `[${name}] `;
  m.notes = [...(m.notes || []).filter((n) => !n.startsWith(tag)), ...notes.map((n) => tag + n)];
  m.harvestedAt = r.at;
  return m;
}
