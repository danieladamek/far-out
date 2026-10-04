import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  SAM_COLUMNS,
  GRANTS_COLUMNS,
  decodeMixed,
  isSbir,
  isoDate,
  keepSamRow,
  mapGrantsHits,
  mergeManifest,
  naicsSector,
  parseSamCsvStream,
  shardBySector,
  type SamRecord,
} from '../../scripts/harvest/lib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FX = path.join(ROOT, 'tests', 'fixtures', 'harvest');
const TODAY = '2026-10-04';
const readFx = (f: string) => fs.readFileSync(path.join(FX, f));

/** Feed the CSV in small chunks so multibyte sequences and quoted newlines straddle chunk boundaries. */
const chunked = (buf: Buffer, size = 97) => Readable.from((function* () { for (let i = 0; i < buf.length; i += size) yield buf.subarray(i, i + size); })());

describe('SAM CSV harvest (fixture sam-50.csv)', async () => {
  const parsed = await parseSamCsvStream(chunked(readFx('sam-50.csv')), { today: TODAY });
  const byTitle = (t: string) => parsed.records.find((r) => r.title.startsWith(t));

  it('reads all 50 rows with the real 47-column header and keeps 32', () => {
    expect(parsed.header).toHaveLength(47);
    expect(parsed.header.slice(0, 3)).toEqual(['NoticeId', 'Title', 'Sol#']);
    expect(parsed.read).toBe(50);
    expect(parsed.malformed).toBe(0);
    expect(parsed.kept).toBe(32);
  });

  it('drops inactive rows and expired non-early notices; keeps deadline = today − 1', () => {
    const titles = parsed.records.map((r) => r.title);
    expect(titles.some((t) => /^Inactive/.test(t))).toBe(false);
    expect(titles).not.toContain('Deadline two days ago');
    expect(titles).not.toContain('Old Solicitation, past deadline');
    expect(titles).not.toContain('Solicitation, deadline in +12 zone two days ago');
    expect(titles).toContain('Deadline yesterday still kept');
    expect(titles).toContain('Janitorial Supplies BPA'); // empty deadline
  });

  it('keeps early notices (Sources Sought etc.) posted within 120 days even past deadline, not older ones', () => {
    const ss = byTitle('Sources Sought - Additive Manufacturing');
    expect(ss?.deadline).toBe('2026-08-15');
    expect(ss?.type).toBe('Sources Sought');
    expect(byTitle('Old Sources Sought beyond 120 days')).toBeUndefined();
    expect(byTitle('Special Notice past, posted 121 days ago')).toBeUndefined();
  });

  it('keepSamRow applies the rule directly', () => {
    const base = { Active: 'Yes', Type: 'Solicitation', PostedDate: '2026-09-01 10:00:00' };
    expect(keepSamRow({ ...base, ResponseDeadLine: '' }, { today: TODAY })).toBe(true);
    expect(keepSamRow({ ...base, ResponseDeadLine: '2026-10-03T23:00:00-04:00' }, { today: TODAY })).toBe(true);
    expect(keepSamRow({ ...base, ResponseDeadLine: '2026-10-02' }, { today: TODAY })).toBe(false);
    expect(keepSamRow({ ...base, Active: 'No', ResponseDeadLine: '' }, { today: TODAY })).toBe(false);
    expect(keepSamRow({ ...base, Type: 'Presolicitation', ResponseDeadLine: '2026-09-05' }, { today: TODAY })).toBe(true);
  });

  it('survives quoted newlines, commas and doubled quotes inside fields', () => {
    const nasa = byTitle('NASA SBIR Ignite');
    expect(nasa?.descExcerpt).toBe('NASA SBIR Ignite pre-solicitation. Line one, line two, with a comma. Line three "quoted".');
    expect(nasa?.naics).toBe('336414'); // fields after the multi-line one still line up
    const vans = byTitle('Wheelchair Accessible Vans');
    expect(vans?.descExcerpt).toContain('destination within 120 days'); // CRLF inside a quoted field
    expect(byTitle('STTR Phase II')?.descExcerpt).toContain('"quantum-safe" key exchange, in partnership');
  });

  it('gives the same result whatever the chunking (1-byte chunks vs one buffer)', async () => {
    const whole = await parseSamCsvStream(Readable.from([readFx('sam-50.csv')]), { today: TODAY });
    const tiny = await parseSamCsvStream(chunked(readFx('sam-50.csv'), 1), { today: TODAY });
    expect(tiny.records).toEqual(whole.records);
    expect(whole.records).toEqual(parsed.records);
  });

  it('decodes the Windows-1252 / UTF-8 mix of the real extract', () => {
    expect(byTitle('Cybersecurity Assessment')?.descExcerpt).toContain('10 U.S.C. § 3204');
    expect(byTitle('Furnish and Install HVAC')?.descExcerpt).toContain('contractor’s responsibility');
    expect(decodeMixed(Buffer.from([0x93, 0x41, 0x94, 0xe2, 0x80, 0x99])).text).toBe('“A”’');
    expect(decodeMixed(Buffer.from([0x41, 0xe2, 0x80]), false)).toEqual({ text: 'A', rest: 2 });
  });

  it('caps descExcerpt at 400 characters', () => {
    for (const r of parsed.records) expect(r.descExcerpt.length).toBeLessThanOrEqual(400);
    expect(byTitle('IT Help Desk Support')?.descExcerpt.length).toBe(400);
    expect(byTitle('IT Help Desk Support')?.descExcerpt.endsWith('…')).toBe(true);
  });

  it('tags SBIR/STTR titles', () => {
    expect(parsed.records.filter((r) => r.sbir).map((r) => r.title).sort()).toEqual(
      [
        'DoD SBIR 26.4 Annual BAA Pre-Release Notice',
        'NASA SBIR Ignite: In-Space Manufacturing Feedstock',
        'Photonics Integrated Circuits SBIR Topic Clarification',
        'Request for Information: STTR Technology Transfer Partnerships',
        'SBIR Phase I: Low-SWaP Hyperspectral Imager for Small UAS',
        'STTR Phase II - Quantum-Safe Key Distribution for Tactical Networks',
        'Small Business Innovation Research (SBIR) Phase I - Machine Learning for Radiology Workflow',
      ].sort(),
    );
    expect(isSbir('SBIR/STTR Phase I')).toBe(true);
    expect(isSbir('sbir phase ii')).toBe(true);
    expect(isSbir('SBIRT screening services')).toBe(false);
    expect(isSbir('')).toBe(false);
  });

  it('normalises dates to ISO YYYY-MM-DD without zones', () => {
    for (const r of parsed.records) {
      expect(r.posted).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(r.deadline).toMatch(/^(\d{4}-\d{2}-\d{2})?$/);
    }
    expect(byTitle('Advanced Battery Materials')?.deadline).toBe('2030-05-01'); // +12:00 source
    expect(isoDate('2026-10-16T15:00:00-07:00')).toBe('2026-10-16');
    expect(isoDate('2026-10-03 06:33:33')).toBe('2026-10-03');
    expect(isoDate('8/1/2024')).toBe('2024-08-01');
    expect(isoDate('')).toBe('');
  });

  it('writes the public notice link and slim columns', () => {
    const r = parsed.records[0];
    expect(Object.keys(r)).toEqual([...SAM_COLUMNS]);
    expect(r.link).toBe(`https://sam.gov/opp/${r.id}/view`);
  });

  it('shards by NAICS sector, rows without NAICS into none.json', () => {
    const { files, bySector } = shardBySector(parsed.records);
    expect(files.map((f) => f.file)).toEqual(['sam/23.json', 'sam/31.json', 'sam/33.json', 'sam/42.json', 'sam/54.json', 'sam/56.json', 'sam/none.json']);
    expect(bySector.none).toBe(3);
    expect(Object.values(bySector).reduce((a, b) => a + b, 0)).toBe(32);
    const none = files.find((f) => f.sector === 'none')!;
    expect(none.body.columns).toEqual([...SAM_COLUMNS]);
    const naicsIdx = SAM_COLUMNS.indexOf('naics');
    expect(none.body.rows.every((row) => row[naicsIdx] === '')).toBe(true);
    expect(naicsSector('541715')).toBe('54');
    expect(naicsSector('')).toBe('none');
  });

  it('splits an oversize sector into numbered parts under the byte cap', () => {
    const many: SamRecord[] = Array.from({ length: 60 }, (_, i) => ({ ...parsed.records[0], id: `x${i}`, naics: '541715' }));
    const { files } = shardBySector(many, { maxBytes: 8_000 });
    expect(files.length).toBeGreaterThan(1);
    expect(files.map((f) => f.file)).toEqual(files.map((_, i) => `sam/54-${i + 1}.json`));
    for (const f of files) expect(Buffer.byteLength(JSON.stringify(f.body))).toBeLessThanOrEqual(8_000);
    expect(files.reduce((a, f) => a + f.count, 0)).toBe(60);
  });
});

describe('Grants.gov search2 mapping (fixture grants-5.json)', () => {
  const json = JSON.parse(readFx('grants-5.json').toString());
  const elig = JSON.parse(readFx('grants-elig23.json').toString());

  it('maps hits to slim records in column order with ISO dates', () => {
    const recs = mapGrantsHits(json);
    expect(recs).toHaveLength(5);
    expect(Object.keys(recs[0])).toEqual([...GRANTS_COLUMNS]);
    expect(recs[0]).toMatchObject({ id: '900101', number: 'PA-26-101', agencyCode: 'HHS-NIH11', openDate: '2026-09-05', closeDate: '2030-04-05', oppStatus: 'posted', docType: 'synopsis', cfdaList: ['93.286', '93.837'], sbir: true });
    const forecast = recs.find((r) => r.oppStatus === 'forecasted')!;
    expect(forecast.openDate).toBe('');
    expect(forecast.closeDate).toBe('');
  });

  it('leaves eligibilities empty when search2 omits them, fills them from filtered queries', () => {
    expect(json.data.oppHits.some((h: object) => 'eligibilities' in h)).toBe(false);
    expect(mapGrantsHits(json).every((r) => r.eligibilities.length === 0)).toBe(true);
    const ids = new Set<string>(elig.data.oppHits.map((h: { id: string }) => h.id));
    const recs = mapGrantsHits(json, { eligibleIds: { '23': ids } });
    expect(recs.filter((r) => r.eligibilities.includes('23')).map((r) => r.id)).toEqual(['900101', '900102', '900103']);
  });

  it('tags SBIR/STTR titles', () => {
    expect(mapGrantsHits(json).map((r) => r.sbir)).toEqual([true, true, true, false, false]);
  });

  it('throws on an error payload instead of returning nothing', () => {
    expect(() => mapGrantsHits({ errorcode: 1, msg: 'bad request' })).toThrow(/errorcode 1/);
  });
});

describe('manifest merge', () => {
  const ok = { ok: true, url: 'u', at: '2026-10-04T00:00:00Z', count: 5, ms: 1, status: 200 };

  it('updates only its own source', () => {
    const m1 = mergeManifest(null, 'sam', { ...ok, count: 7, bytes: 10 });
    const m2 = mergeManifest(m1, 'grants', ok);
    expect(m2.counts).toEqual({ sam: 7, grants: 5 });
    expect(m2.sources.sam?.count).toBe(7);
    expect(m2.failures).toEqual([]);
  });

  it('records a failure with its status and keeps the previous result', () => {
    const m1 = mergeManifest(mergeManifest(null, 'sam', { ...ok, count: 7 }), 'grants', ok);
    const m2 = mergeManifest(m1, 'grants', { ok: false, url: 'u', at: '2026-10-05T00:00:00Z', ms: 2, status: 503, message: 'HTTP 503' });
    expect(m2.failures).toEqual([{ source: 'grants', status: 503, message: 'HTTP 503', at: '2026-10-05T00:00:00Z' }]);
    expect(m2.sources.grants).toMatchObject({ ok: false, stale: true, count: 5, harvestedAt: '2026-10-04T00:00:00Z' });
    expect(m2.counts).toEqual({ sam: 7, grants: 5 });
    const m3 = mergeManifest(m2, 'grants', { ...ok, at: '2026-10-06T00:00:00Z' });
    expect(m3.failures).toEqual([]);
  });
});
