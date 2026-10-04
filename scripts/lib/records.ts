/**
 * Extension records (KICKOFF §4b): cross-reference checks, citation coverage of record prose, and term/citation
 * linking of the fields the app renders. Pure functions over parsed records so the unit tests can run them on a
 * fixture pack.
 *
 * - Every id in `gates[]`, `programs[]`, `affects[]` must resolve; every `sources[]` number and every `[n]` in any
 *   string field must resolve to references.yaml.
 * - Prose fields (`what`, `how_it_works[]`, `eligibility[]`, `steps[]`, `benefits[]`, `distinctive`,
 *   `pending_changes[].text`) obey the same citation-coverage gate as review.md: an item of ≥ 25 words with no
 *   `[n]` and no `<!-- framing -->` marker is a build error (APP-SPEC §6.1), never repaired by adding a citation.
 * - Rendering: prose fields get term links (first occurrence per record) and citation tokens; every other string
 *   that carries `[n]` gets citation tokens only. The words are never changed.
 */
import { claimWords } from './parse';
import { CITE_RE, expandCitation, linkCitations, linkTerms, type Matcher } from './linker';
import type { BuildError, RecordFile } from './schemas';

export type AnyRecord = Record<string, unknown> & { id: string };
export type RecordSet = Record<RecordFile, AnyRecord[]>;

export const PROSE_FIELDS = ['what', 'how_it_works', 'eligibility', 'steps', 'benefits', 'distinctive'] as const;
/** Fields whose strings are ids, URLs or dates — never scanned for citations, never linked. */
const SKIP_KEY = /^(id|as_of|date|family|kind|gates|programs|situations|affects|certs|registrations|sources|official_url|portal|forecast_url|office_url|supplier_portal_url|related_urls|final_url|url|component_of|record)$/;

export interface RecordCheckContext {
  refNs: Set<number>;
  gateWords?: number;
}

export interface RecordCheckResult {
  errors: BuildError[];
  /** reference numbers cited from any record (sources[] or an inline [n]) — they count as cited */
  cited: Set<number>;
  /** reference number → record keys ("routes/x") that cite it */
  citedBy: Map<number, string[]>;
  uncited: { where: string; words: number; excerpt: string }[];
  proseItems: number;
  proseCited: number;
  proseFraming: number;
}

function* strings(v: unknown, path: string[] = []): Generator<{ path: string[]; s: string }> {
  if (typeof v === 'string') { yield { path, s: v }; return; }
  if (Array.isArray(v)) { for (const [i, x] of v.entries()) yield* strings(x, [...path, String(i)]); return; }
  if (v && typeof v === 'object') {
    for (const [k, x] of Object.entries(v)) { if (!SKIP_KEY.test(k)) yield* strings(x, [...path, k]); }
  }
}

/** The prose items of a record that the citation-coverage gate applies to. */
export function proseItems(r: AnyRecord): { field: string; s: string }[] {
  const out: { field: string; s: string }[] = [];
  for (const f of PROSE_FIELDS) {
    const v = r[f];
    if (typeof v === 'string') out.push({ field: f, s: v });
    else if (Array.isArray(v)) v.forEach((x, i) => { if (typeof x === 'string') out.push({ field: `${f}/${i}`, s: x }); });
  }
  const pcs = r.pending_changes;
  if (Array.isArray(pcs)) pcs.forEach((p, i) => { const t = (p as { text?: unknown }).text; if (typeof t === 'string') out.push({ field: `pending_changes/${i}/text`, s: t }); });
  return out;
}

export function checkRecords(set: RecordSet, ctx: RecordCheckContext): RecordCheckResult {
  const gate = ctx.gateWords ?? 25;
  const errors: BuildError[] = [];
  const E = (where: string, message: string) => errors.push({ where, message });
  const cited = new Set<number>();
  const citedBy = new Map<number, string[]>();
  const cite = (n: number, key: string) => { cited.add(n); const a = citedBy.get(n) ?? []; if (!a.includes(key)) a.push(key); citedBy.set(n, a); };
  const uncited: RecordCheckResult['uncited'] = [];
  let proseCount = 0, proseCited = 0, proseFraming = 0;

  const ids = Object.fromEntries((Object.keys(set) as RecordFile[]).map((f) => [f, new Set(set[f].map((r) => r.id))])) as Record<RecordFile, Set<string>>;
  const anyId = new Set(Object.values(ids).flatMap((s) => [...s]));

  for (const file of Object.keys(set) as RecordFile[]) {
    const seen = new Set<string>();
    for (const r of set[file]) {
      const key = `${file}/${r.id}`;
      if (seen.has(r.id)) E(key, 'duplicate id');
      seen.add(r.id);
      for (const g of (r.gates as string[] | undefined) ?? []) if (!ids.gates.has(g)) E(key, `gates[] -> unknown gate id ${g}`);
      for (const p of (r.programs as unknown[] | undefined) ?? []) {
        // primes.yaml uses `programs` for the company's own programme list (objects), not program ids
        if (typeof p === 'string' && !ids.programs.has(p)) E(key, `programs[] -> unknown program id ${p}`);
      }
      for (const a of (r.affects as string[] | undefined) ?? []) if (!anyId.has(a)) E(key, `affects[] -> unknown record id ${a}`);
      for (const n of (r.sources as number[] | undefined) ?? []) {
        if (!ctx.refNs.has(n)) E(key, `sources -> [${n}] has no reference entry`);
        else cite(n, key);
      }
      for (const { path, s } of strings(r)) {
        CITE_RE.lastIndex = 0;
        for (const m of s.matchAll(CITE_RE)) {
          for (const n of expandCitation(m[1])) {
            if (!ctx.refNs.has(n)) E(`${key}/${path.join('/')}`, `cites [${n}] with no reference entry`);
            else cite(n, key);
          }
        }
      }
      for (const { field, s } of proseItems(r)) {
        proseCount++;
        const plain = s.replace(/<!--[\s\S]*?-->/g, '').trim();
        const isCited = /\[\d/.test(plain);
        const framing = /<!--\s*framing\s*-->/.test(s);
        if (isCited) proseCited++;
        if (framing) proseFraming++;
        const words = claimWords(plain);
        if (words >= gate && !isCited && !framing) {
          uncited.push({ where: `${key}/${field}`, words, excerpt: plain.slice(0, 120) });
          E(`${key}/${field}`, `uncited record prose of ${words} words — cite it or mark it <!-- framing -->: ${JSON.stringify(plain.slice(0, 120))}`);
        }
      }
    }
  }
  return { errors, cited, citedBy, uncited, proseItems: proseCount, proseCited, proseFraming };
}

/**
 * Return a copy of the record with prose fields term-linked (first occurrence per record) and every string that
 * carries `[n]` turned into citation tokens. Also returns the term ids linked.
 */
export function linkRecord<T extends AnyRecord>(r: T, matcher: Matcher, opts: { everyOccurrence?: boolean } = {}): { record: T; terms: string[] } {
  const seen = new Set<string>();
  const terms: string[] = [];
  const prose = (s: string) => {
    const t = linkTerms(s, matcher, { everyOccurrence: opts.everyOccurrence, seen });
    terms.push(...t.linked);
    return linkCitations(t.text).text;
  };
  const citeOnly = (s: string) => (/\[\d/.test(s) ? linkCitations(s).text : s);
  const walk = (v: unknown, key: string, inProse: boolean): unknown => {
    if (typeof v === 'string') return SKIP_KEY.test(key) ? v : inProse ? prose(v) : citeOnly(v);
    if (Array.isArray(v)) return SKIP_KEY.test(key) ? v : v.map((x) => walk(x, key, inProse));
    if (v && typeof v === 'object') {
      const o: Record<string, unknown> = {};
      for (const [k, x] of Object.entries(v)) o[k] = walk(x, k, inProse || (key === 'pending_changes' && k === 'text'));
      return o;
    }
    return v;
  };
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(r)) {
    const isProse = (PROSE_FIELDS as readonly string[]).includes(k) || k === 'who_for';
    out[k] = k === 'pending_changes' ? walk(v, 'pending_changes', false) : walk(v, k, isProse);
  }
  return { record: out as T, terms };
}

/* ───────────────────────── gates: grouping derived from the gate's own fields (KICKOFF §4b /gates) */

export const GATE_GROUPS = [
  { id: 'ot', label: 'OT-specific', rule: 'the gate id, name or the first sentence of applies_when names other transactions or a consortium agreement' },
  { id: 'paid', label: 'Getting paid', rule: 'the name or the first sentence of applies_when is about payment, invoicing or being paid' },
  { id: 'contract-type', label: 'By contract type', rule: 'the first sentence of applies_when names a contract type: cost-reimbursement or cost-type, a subcontract, or a joint venture' },
  { id: 'threshold', label: 'Above a threshold', rule: 'the first sentence of applies_when states a dollar figure or a threshold' },
  { id: 'touches', label: 'By what the work touches', rule: 'the first sentence of applies_when names what the work handles: classified or controlled information, exports, construction, labour, data or software, work abroad' },
  { id: 'every', label: 'Nearly every route', rule: 'none of the above: the gate applies broadly (registration, representations, size)' },
] as const;
export type GateGroupId = (typeof GATE_GROUPS)[number]['id'];

const firstSentence = (s: string) => (/^[\s\S]*?(?:\.|;)(?=\s|$)/.exec(s.replace(/\s+/g, ' '))?.[0] ?? s).trim();

/** Classify a gate by its own fields; returns the group and the words that put it there (shown on /gates). */
export function classifyGate(g: { id: string; name: string; applies_when: string }): { group: GateGroupId; because: string } {
  const lead = firstSentence(g.applies_when);
  const tests: [GateGroupId, RegExp, string][] = [
    ['ot', /\bother transactions?\b|\bOTs?\b|\bconsorti(um|a)\b/i, `${g.id} ${g.name} ${lead}`],
    ['paid', /\bpay(ment|ments|able)?\b|\bpaid\b|\binvoic\w*/i, `${g.name} ${lead}`],
    ['contract-type', /\bcost-reimbursement\b|\bcost-type\b|\bsubcontract(s|or|ors)?\b|\bjoint ventures?\b/i, lead],
    ['threshold', /\$\s?\d[\d,]*(\.\d+)?( (million|billion))?|\bthresholds?\b/i, lead],
    ['touches', /\bclassified\b|\bexport\w*|\bITAR\b|\bCUI\b|\bFCI\b|\bconstruction\b|\blabou?r\b|\bwages?\b|\btechnical data\b|\bsoftware\b|\boutside the U\.?S\.?\b|\bprize\b/i, lead],
  ];
  for (const [group, re, hay] of tests) {
    const m = re.exec(hay);
    if (m) return { group, because: m[0].trim() };
  }
  return { group: 'every', because: '' };
}
