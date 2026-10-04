/**
 * build-content.ts — validate the content pack, link terms, emit src/data/*.json + public/provenance.json.
 *
 * Topic mode (APP-SPEC §6.1): the body is review.md, the citation-coverage gate is enforced per block (and on
 * concept bodies and on extension-record prose), every `<!-- synthesis -->` passage gets a stable id, scope.yaml
 * and queries.yaml are published content, references are tiered.
 * FAR Out extensions (KICKOFF §4b): routes, programs, certifications, gates, buyers, help, primes, mechanics,
 * changes, queries and the pathfinder are validated (permissively for keys, strictly for ids and [n]) and emitted.
 *
 * Fails loudly (exit 1) on any schema violation, unresolved [n], unknown term/concept/route/gate/program id,
 * missing data file, ambiguous term variant or uncited block. Errors are written to content-pack/BUILD-ERRORS.md
 * and src/data/build-errors.json so /methods can surface them; whatever validated is still emitted. Idempotent:
 * outputs are rewritten only when their content changed.
 *
 * BX_PACK points the build at another pack (the unit tests use fixture packs); BX_OUT redirects every output.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import {
  ConceptFrontmatterSchema, FiguresSchema, GlossarySchema, ManifestSchema, PathfinderSchema, QueriesSchema,
  RECORD_FILES, RECORD_SCHEMAS, ReferencesSchema, ScopeSchema, SITUATIONS, TodoSchema, zodErrors,
  type BuildError, type ConceptFrontmatter, type FigureDef, type GlossaryEntry, type Pathfinder, type Query, type RecordFile, type Reference,
} from './lib/schemas';
import { buildMatcher, CITE_RE, expandCitation, findAmbiguousVariants, linkCitations, linkTerms } from './lib/linker';
import { claimWords, parseReview, splitBlocks } from './lib/parse';
import { loadFigureData, type LoadedFigure } from './lib/figures';
import { checkRecords, classifyGate, GATE_GROUPS, linkRecord, type AnyRecord, type RecordSet } from './lib/records';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PACK = path.resolve(process.env.BX_PACK ?? path.join(ROOT, 'content-pack'));
const OUT = path.resolve(process.env.BX_OUT ?? ROOT);

const errors: BuildError[] = [];
const warnings: string[] = [];
const E = (where: string, message: string) => errors.push({ where, message });
const W = (m: string) => warnings.push(m);
const written: { file: string; status: 'written' | 'unchanged'; bytes: number }[] = [];

function readYaml(file: string, required = true): unknown {
  const p = path.join(PACK, file);
  if (!fs.existsSync(p)) { if (required) E(file, 'missing file'); return undefined; }
  try { return yaml.load(fs.readFileSync(p, 'utf8')); } catch (e) { E(file, `YAML parse error: ${(e as Error).message}`); return undefined; }
}

function emit(rel: string, content: string | Buffer) {
  const p = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const buf = Buffer.isBuffer(content) ? content : Buffer.from(content);
  const same = fs.existsSync(p) && Buffer.compare(fs.readFileSync(p), buf) === 0;
  if (!same) fs.writeFileSync(p, buf);
  written.push({ file: rel, status: same ? 'unchanged' : 'written', bytes: buf.length });
}
const emitJson = (rel: string, data: unknown) => emit(rel, JSON.stringify(data) + '\n');
const D = (f: string) => `src/data/${f}`;

const count = <T,>(xs: T[], key: (x: T) => string | undefined | null): Record<string, number> => {
  const o: Record<string, number> = {};
  for (const x of xs) { const k = key(x); if (k !== undefined && k !== null) o[k] = (o[k] ?? 0) + 1; }
  return o;
};
const citesIn = (s: string): number[] => [...s.matchAll(CITE_RE)].flatMap((m) => expandCitation(m[1]));

// ───────────────────────── 1. load + validate the standard files
const manifestParsed = ManifestSchema.safeParse(readYaml('manifest.yaml'));
if (!manifestParsed.success) errors.push(...zodErrors('manifest', manifestParsed.error));
const manifest = manifestParsed.success ? manifestParsed.data : undefined;
const TOPIC = manifest?.mode === 'topic';

const glossaryParsed = GlossarySchema.safeParse(readYaml('glossary.yaml') ?? []);
if (!glossaryParsed.success) errors.push(...zodErrors('glossary', glossaryParsed.error));
const glossary: GlossaryEntry[] = glossaryParsed.success ? glossaryParsed.data : [];
const termIds = new Set(glossary.map((t) => t.id));
for (const [i, t] of glossary.entries()) if (glossary.findIndex((u) => u.id === t.id) !== i) E(`glossary/${t.id}`, 'duplicate id');
const ambiguous = findAmbiguousVariants(glossary);
for (const a of ambiguous) E('glossary', `ambiguous variant ${JSON.stringify(a.variant)} claimed by ${a.ids.join(' and ')}`);
const matcher = buildMatcher(glossary);
const everyOccurrence = manifest?.link_every_occurrence ?? false;

const referencesParsed = ReferencesSchema.safeParse(readYaml('references.yaml') ?? []);
if (!referencesParsed.success) errors.push(...zodErrors('references', referencesParsed.error));
const references: Reference[] = referencesParsed.success ? referencesParsed.data : [];
const refByN = new Map<number, Reference>();
for (const r of references) { if (refByN.has(r.n)) E(`references/${r.n}`, 'duplicate n'); refByN.set(r.n, r); }
const refNs = new Set(refByN.keys());
const keys = new Map<string, number>();
for (const r of references) { if (keys.has(r.key)) W(`references/${r.n}: duplicate key ${r.key} (also [${keys.get(r.key)}])`); keys.set(r.key, r.n); }

/** Where a reference is cited from (sections, concepts, figures, glossary, records). */
const citedFrom = new Map<number, Set<string>>();
const markCited = (n: number, from: string) => { if (!citedFrom.has(n)) citedFrom.set(n, new Set()); citedFrom.get(n)!.add(from); };
const checkCites = (where: string, s: string) => { for (const n of citesIn(s)) { if (!refNs.has(n)) E(where, `cites [${n}] with no reference entry`); else markCited(n, where); } };

const conceptDir = path.join(PACK, 'concepts');
const conceptFiles = fs.existsSync(conceptDir) ? fs.readdirSync(conceptDir).filter((f) => f.endsWith('.md')).sort() : [];
interface ConceptOut extends ConceptFrontmatter { body_before: string; picture: string | null; body_after: string; has_math: boolean; linked_terms: string[]; used_by_terms: string[]; used_by_figures: string[]; used_by_concepts: string[] }
const concepts: ConceptOut[] = [];
const conceptUncited: { where: string; words: number; excerpt: string }[] = [];
const CONCEPT_USE_HEADINGS = ['## How this guide uses it', '## How this paper uses it'];
for (const f of conceptFiles) {
  const src = fs.readFileSync(path.join(conceptDir, f), 'utf8');
  const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(src);
  if (!m) { E(`concepts/${f}`, 'no frontmatter'); continue; }
  let fm: unknown;
  try { fm = yaml.load(m[1]); } catch (e) { E(`concepts/${f}`, `frontmatter YAML: ${(e as Error).message}`); continue; }
  const parsed = ConceptFrontmatterSchema.safeParse(fm);
  if (!parsed.success) { errors.push(...zodErrors(`concepts/${f}`, parsed.error)); continue; }
  const c = parsed.data;
  if (c.id !== f.replace(/\.md$/, '')) E(`concepts/${f}`, `id ${c.id} != filename`);
  const raw = m[2].trim();
  if (!raw.includes('## What it is')) W(`concept ${c.id}: missing section '## What it is'`);
  if (!CONCEPT_USE_HEADINGS.some((h) => raw.includes(h))) W(`concept ${c.id}: missing section '## How this guide uses it'`);
  // the same coverage gate as review.md, mirroring tools/validate_pack.py (KaTeX is not prose)
  let marker: string | null = null;
  for (const b of splitBlocks(raw.replace(/\$\$[\s\S]*?\$\$/g, ' '))) {
    const txt = b.replace(/<!--[\s\S]*?-->/g, '').trim();
    if (!txt) { marker = /framing/.test(b) ? 'framing' : null; continue; }
    if (/^(#|```|\||>)/.test(txt)) { marker = null; continue; }
    const framing = marker === 'framing' || /<!--\s*framing\s*-->/.test(b);
    const words = claimWords(txt);
    if (words >= 25 && !/\[\d/.test(txt) && !framing) {
      conceptUncited.push({ where: `concepts/${c.id}`, words, excerpt: txt.slice(0, 120) });
      E(`concepts/${c.id}`, `uncited block of ${words} words — cite it or mark it <!-- framing -->: ${JSON.stringify(txt.slice(0, 120))}`);
    }
    marker = null;
  }
  checkCites(`concepts/${c.id}`, raw.replace(/\$\$[\s\S]*?\$\$/g, ' '));
  for (const q of c.self_check) checkCites(`concepts/${c.id}`, q.explanation);
  const seen = new Set<string>();
  const linked: string[] = [];
  const link = (s: string) => { const t = linkTerms(s, matcher, { everyOccurrence, seen }); linked.push(...t.linked); return linkCitations(t.text).text; };
  const body = link(raw.replace(/<!--\s*(framing|synthesis)\s*-->/g, ''));
  const pic = /(^|\n)## The key idea in one picture\s*\n([\s\S]*?)(?=\n## |$)/.exec(body);
  let body_before = body, picture: string | null = null, body_after = '';
  if (pic) {
    body_before = body.slice(0, pic.index).trim();
    picture = pic[2].trim();
    body_after = body.slice(pic.index + pic[0].length).trim();
  }
  const self_check = c.self_check.map((q) => ({ ...q, explanation: linkCitations(q.explanation).text }));
  concepts.push({ ...c, self_check, body_before, picture, body_after, has_math: /\$\$/.test(raw), linked_terms: linked, used_by_terms: [], used_by_figures: [], used_by_concepts: [] });
}
const conceptIds = new Set(concepts.map((c) => c.id));
for (const c of concepts) {
  for (const p of c.prerequisites) if (!conceptIds.has(p)) E(`concepts/${c.id}`, `unknown prerequisite ${p}`);
  for (const t of c.terms) if (!termIds.has(t)) E(`concepts/${c.id}`, `unknown term ${t}`);
}
for (const t of glossary) {
  if (t.concept && !conceptIds.has(t.concept)) E(`glossary/${t.id}`, `concept -> unknown ${t.concept}`);
  for (const s of t.see) if (!termIds.has(s)) E(`glossary/${t.id}`, `see -> unknown ${s}`);
  checkCites(`glossary/${t.id}`, `${t.short} ${t.definition}`);
}

const figuresParsed = FiguresSchema.safeParse(readYaml('figures.yaml') ?? []);
if (!figuresParsed.success) errors.push(...zodErrors('figures', figuresParsed.error));
const figures: FigureDef[] = figuresParsed.success ? figuresParsed.data : [];
const figureIds = new Set(figures.map((f) => f.id));
for (const [i, f] of figures.entries()) if (figures.findIndex((u) => u.id === f.id) !== i) E(`figures/${f.id}`, 'duplicate id');
if (TOPIC) for (const f of figures) {
  if (!f.synthesis) E(`figures/${f.id}`, 'topic mode needs synthesis: data | conceptual');
  if (!f.refs.length) E(`figures/${f.id}`, 'topic mode needs refs: [n, …] — a figure with no references does not ship');
  if (f.kind === 'image' && !/permission/i.test(manifest?.permissions.figures ?? '')) E(`figures/${f.id}`, 'kind image in topic mode needs explicit permission in manifest.permissions.figures');
}

const todoParsed = TodoSchema.safeParse(readYaml('todo.yaml', false) ?? []);
if (!todoParsed.success) errors.push(...zodErrors('todo', todoParsed.error));
const todo = todoParsed.success ? todoParsed.data : [];

let scope = undefined as undefined | ReturnType<typeof ScopeSchema.parse>;
if (TOPIC) {
  const scopeParsed = ScopeSchema.safeParse(readYaml('scope.yaml'));
  if (!scopeParsed.success) errors.push(...zodErrors('scope', scopeParsed.error));
  else { scope = scopeParsed.data; if (scope.assumed) W('scope: assumed=true — the defaults taken are listed on /methods'); }
}
const queriesParsed = QueriesSchema.safeParse(readYaml('queries.yaml') ?? []);
if (!queriesParsed.success) errors.push(...zodErrors('queries', queriesParsed.error));
const queries: Query[] = queriesParsed.success ? queriesParsed.data : [];

// ───────────────────────── 2. extension records + pathfinder (KICKOFF §4b)
const records = {} as RecordSet;
for (const file of RECORD_FILES) {
  const raw = readYaml(`${file}.yaml`);
  const arr = Array.isArray(raw) ? raw : [];
  if (raw !== undefined && !Array.isArray(raw)) E(`${file}.yaml`, 'must be a list of records');
  const ok: AnyRecord[] = [];
  for (const [i, rec] of arr.entries()) {
    const p = RECORD_SCHEMAS[file].safeParse(rec);
    const id = (rec as { id?: string })?.id ?? `#${i}`;
    if (!p.success) errors.push(...zodErrors(`${file}/${id}`, p.error));
    else ok.push(p.data as AnyRecord);
  }
  records[file] = ok;
}
const recordCheck = checkRecords(records, { refNs });
errors.push(...recordCheck.errors);
for (const [n, keysList] of recordCheck.citedBy) for (const k of keysList) markCited(n, k);
const recordKeys = new Set((Object.keys(records) as RecordFile[]).flatMap((f) => records[f].map((r) => `${f}/${r.id}`)));

const pfParsed = PathfinderSchema.safeParse(readYaml('pathfinder.yaml'));
if (!pfParsed.success) errors.push(...zodErrors('pathfinder', pfParsed.error));
const pathfinder: Pathfinder | undefined = pfParsed.success ? pfParsed.data : undefined;
if (pathfinder) {
  const routeIds = new Set(records.routes.map((r) => r.id));
  for (const r of pathfinder.routes) if (!routeIds.has(r.id)) E(`pathfinder/routes/${r.id}`, 'unknown route id');
  for (const r of records.routes) if (!pathfinder.routes.some((p) => p.id === r.id)) W(`pathfinder: route ${r.id} has no ranking entry — it can never appear on /`);
  const certValues = new Set(pathfinder.questions.filter((q) => q.modifier === 'certs').flatMap((q) => q.options.map((o) => String(o.value))));
  for (const r of pathfinder.routes) for (const c of r.certs) if (!certValues.has(c)) E(`pathfinder/routes/${r.id}`, `certs ${c} is not an answer to the certifications question`);
  for (const a of pathfinder.always_show) if (!recordKeys.has(`routes/${a}`) && !recordKeys.has(`gates/${a}`) && !recordKeys.has(`programs/${a}`)) E('pathfinder/always_show', `unknown record id ${a}`);
  const tags = pathfinder.questions.flatMap((q) => q.options.map((o) => o.tag).filter(Boolean));
  for (const t of SITUATIONS) if (!tags.includes(t)) E('pathfinder/questions', `situation tag ${t} is not offered by any question`);
}

// ───────────────────────── 3. review.md → sections, blocks, term links, citation tokens
const bodyFile = TOPIC ? 'review.md' : 'manuscript.md';
const bodyPath = path.join(PACK, bodyFile);
const body = fs.existsSync(bodyPath) ? fs.readFileSync(bodyPath, 'utf8') : (E(bodyFile, 'missing file'), '');
const parsed = parseReview(body, matcher, { everyOccurrence });
for (const d of parsed.duplicateSections) E(bodyFile, `duplicate section id ${d}`);
const sectionIds = new Set(parsed.sections.map((s) => s.id));
for (const fm of parsed.figureMarkers) if (!figureIds.has(fm)) E(bodyFile, `figure marker ${fm} not in figures.yaml`);
for (const f of figures) if (!parsed.figureMarkers.includes(f.id)) W(`figure ${f.id} has no marker in ${bodyFile}`);
for (const u of parsed.uncited) E(`${bodyFile}/${u.section}`, `uncited block of ${u.words} words — cite it or mark it <!-- framing -->: ${JSON.stringify(u.excerpt)}`);
if (TOPIC) for (const q of body.match(/[“"]([^”"\n]{4,})[”"]/g) ?? []) {
  const inner = q.slice(1, -1);
  if (inner.split(/\s+/).length > 25) E(bodyFile, `quotation longer than 25 words: ${JSON.stringify(inner.slice(0, 60))}`);
}
const unresolvedCitations = parsed.citations.filter((n) => !refByN.has(n));
for (const n of unresolvedCitations) E(bodyFile, `cites [${n}] with no reference entry`);
for (const s of parsed.sections) for (const n of s.cites) if (refNs.has(n)) markCited(n, `sections/${s.id}`);
for (const f of figures) {
  for (const n of f.refs) { if (!refByN.has(n)) E(`figures/${f.id}`, `refs -> [${n}] has no reference entry`); else markCited(n, `figures/${f.id}`); }
  checkCites(`figures/${f.id}`, `${f.caption} ${f.how_to_read} ${f.source} ${f.explain.map((e) => e.text).join(' ')}`);
}

// ───────────────────────── 4. figure data + declared fields
const loaded = new Map<string, LoadedFigure>();
for (const f of figures) {
  loaded.set(f.id, loadFigureData(f, PACK, { termIds, sectionIds, refNs, topic: TOPIC, recordKeys }, errors));
  for (const ex of f.explain) {
    if (ex.term && !termIds.has(ex.term)) E(`figures/${f.id}`, `explain term ${ex.term} unknown`);
    if (ex.concept && !conceptIds.has(ex.concept)) E(`figures/${f.id}`, `explain concept ${ex.concept} unknown`);
  }
  for (const c of f.concepts) if (!conceptIds.has(c)) E(`figures/${f.id}`, `concept ${c} unknown`);
  for (const s of f.discussed_in) if (!sectionIds.has(s)) E(`figures/${f.id}`, `discussed_in section ${s} unknown`);
  for (const t of loaded.get(f.id)?.table?.rows ?? []) for (const n of String(t.ref ?? '').split(/[;,]/).filter(Boolean).map(Number)) if (refNs.has(n)) markCited(n, `figures/${f.id}`);
  for (const nd of loaded.get(f.id)?.pathway?.nodes ?? []) for (const n of nd.refs) if (refNs.has(n)) markCited(n, `figures/${f.id}`);
}
for (const c of concepts) for (const fg of c.figures) if (!figureIds.has(fg)) E(`concepts/${c.id}`, `unknown figure ${fg}`);

// references: cited_in ids, the "never cited" check (a reference cited only from a record is cited), unverified
for (const r of references) for (const s of r.cited_in) {
  const ok = sectionIds.has(s) || figureIds.has(s) || conceptIds.has(s) || recordKeys.has(s) || [...recordKeys].some((k) => k.endsWith(`/${s}`));
  if (!ok) W(`references/${r.n}: cited_in ${s} names nothing in this build`);
}
const neverCited = references.filter((r) => !citedFrom.has(r.n)).map((r) => r.n);
if (neverCited.length) W(`${neverCited.length} references are cited nowhere (review, concepts, figures, glossary or records)`);
// APP-SPEC §6.1 rule 7 — a claim resting on a verified: false reference is flagged on /methods in amber.
const unverifiedButCited = references.filter((r) => !r.verified && citedFrom.has(r.n)).map((r) => r.n);
for (const n of unverifiedButCited) W(`references/${n}: cited but verified: false — flagged on /methods`);

// ───────────────────────── 5. pack voice (KICKOFF §1): second person in pack text is a pack error, rendered as written
const voice: { where: string; excerpt: string }[] = [];
const YOU = /\b(you|your|yours|yourself)\b/i;
const voiceCheck = (where: string, s: string) => {
  for (const sentence of s.replace(/<!--[\s\S]*?-->/g, '').split(/(?<=[.!?])\s+/)) {
    if (YOU.test(sentence) && !/^["“]/.test(sentence.trim())) voice.push({ where, excerpt: sentence.trim().slice(0, 200) });
  }
};
if (manifest) voiceCheck('manifest/plain_abstract', manifest.plain_abstract);
for (const s of parsed.sections) for (const c of s.chunks) if (c.kind === 'md') voiceCheck(`review.md/${s.id}`, c.md.replace(/\]\(#(term|cite):[^)]*\)/g, ']'));
for (const file of RECORD_FILES) for (const r of records[file]) for (const k of ['what', 'who_for', 'how_it_works', 'steps', 'benefits', 'requirements'] as const) {
  const v = r[k];
  for (const s of typeof v === 'string' ? [v] : Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []) voiceCheck(`${file}/${r.id}/${k}`, s);
}

// ───────────────────────── 6. cross-links used by the app
const appearsIn = new Map<string, string[]>();
for (const s of parsed.sections) for (const t of s.terms) { if (!appearsIn.has(t)) appearsIn.set(t, []); appearsIn.get(t)!.push(s.id); }
const inRecords = new Map<string, string[]>();
const linkedRecords = {} as Record<RecordFile, AnyRecord[]>;
for (const file of RECORD_FILES) {
  linkedRecords[file] = records[file].map((r) => {
    const { record, terms } = linkRecord(r, matcher, { everyOccurrence });
    for (const t of terms) { if (!inRecords.has(t)) inRecords.set(t, []); inRecords.get(t)!.push(`${file}/${r.id}`); }
    return record;
  });
}
const inConcepts = new Map<string, string[]>();
for (const c of concepts) for (const t of [...new Set([...c.terms, ...c.linked_terms])]) { if (!inConcepts.has(t)) inConcepts.set(t, []); inConcepts.get(t)!.push(c.id); }
const termFigures = new Map<string, Set<string>>();
for (const f of figures) for (const ex of f.explain) if (ex.term) { if (!termFigures.has(ex.term)) termFigures.set(ex.term, new Set()); termFigures.get(ex.term)!.add(f.id); }
for (const c of concepts) {
  c.used_by_terms = glossary.filter((t) => t.concept === c.id).map((t) => t.id);
  c.used_by_figures = figures.filter((f) => f.concepts.includes(c.id) || f.explain.some((e) => e.concept === c.id)).map((f) => f.id);
  c.used_by_concepts = concepts.filter((o) => o.prerequisites.includes(c.id)).map((o) => o.id);
}
const refSections = new Map<number, string[]>();
for (const s of parsed.sections) for (const n of s.cites) { if (!refSections.has(n)) refSections.set(n, []); refSections.get(n)!.push(s.id); }

// which routes require each gate; which records each change affects (and the reverse)
const gateRoutes = new Map<string, string[]>();
const gatePrograms = new Map<string, string[]>();
for (const r of records.routes) for (const g of (r.gates as string[]) ?? []) { if (!gateRoutes.has(g)) gateRoutes.set(g, []); gateRoutes.get(g)!.push(r.id); }
for (const p of records.programs) for (const g of (p.gates as string[]) ?? []) { if (!gatePrograms.has(g)) gatePrograms.set(g, []); gatePrograms.get(g)!.push(p.id); }
const changedBy = new Map<string, string[]>();
for (const c of records.changes) for (const a of (c.affects as string[]) ?? []) { if (!changedBy.has(a)) changedBy.set(a, []); changedBy.get(a)!.push(c.id); }
const programRoutes = new Map<string, string[]>();
for (const r of records.routes) for (const p of (r.programs as string[]) ?? []) { if (!programRoutes.has(p)) programRoutes.set(p, []); programRoutes.get(p)!.push(r.id); }
const fileOfId = (id: string): RecordFile[] => RECORD_FILES.filter((f) => records[f].some((r) => r.id === id));

// ───────────────────────── 7. emit
const words = parsed.sections.reduce((a, s) => a + s.words, 0);
if (manifest) emitJson(D('manifest.json'), { ...manifest, sections: parsed.sections.length, words, references: references.length });
emitJson(D('sections.json'), parsed.sections);
emitJson(D('sections-index.json'), parsed.sections.map((s) => ({ id: s.id, title: s.title, depth: s.depth, number: s.number, words: s.words, figures: s.figures, synthesis_blocks: s.synthesis_blocks, terms: s.terms })));
emitJson(D('glossary.json'), glossary.map((t) => ({
  ...t,
  definition: linkCitations(t.definition).text,
  appears_in: appearsIn.get(t.id) ?? [],
  in_records: inRecords.get(t.id) ?? [],
  in_concepts: inConcepts.get(t.id) ?? [],
  occurrences: parsed.occurrences[t.id] ?? 0,
  figures: [...(termFigures.get(t.id) ?? [])],
})));
emitJson(D('glossary-short.json'), glossary.map((t) => ({ id: t.id, term: t.term, kind: t.kind, domain: t.domain, short: t.short, concept: t.concept ?? null })));
emitJson(D('concepts.json'), concepts);
emitJson(D('concepts-index.json'), concepts.map((c) => ({ id: c.id, title: c.title, one_liner: c.one_liner, prerequisites: c.prerequisites, figures: c.figures, terms: c.terms })));

const figuresOut = figures.map((f) => {
  const d = loaded.get(f.id);
  return {
    ...f,
    caption: linkCitations(f.caption).text,
    how_to_read: linkCitations(f.how_to_read).text,
    source: linkCitations(f.source).text,
    explain: f.explain.map((e) => ({ ...e, text: linkCitations(e.text).text })),
    table: d?.table,
    pathway: d?.pathway,
    provenance: f.kind === 'image' ? 'original image' : f.synthesis === 'conceptual' ? 'synthesised: conceptual diagram drawn from the cited sources' : 'synthesised from data across cited works',
  };
});
emitJson(D('figures.json'), figuresOut);
// one chunk per figure, so a figure page loads only its own data
const figDir = path.join(OUT, 'src/data/figures');
if (fs.existsSync(figDir)) for (const f of fs.readdirSync(figDir)) if (!figuresOut.some((x) => `${x.id}.json` === f)) fs.unlinkSync(path.join(figDir, f));
for (const f of figuresOut) emitJson(D(`figures/${f.id}.json`), f);
emitJson(D('figures-index.json'), figuresOut.map((f) => ({
  id: f.id, label: f.label, title: f.title, kind: f.kind, synthesis: f.synthesis ?? null,
  provenance: f.provenance, concepts: f.concepts, refs: f.refs, rows: f.table?.rows.length ?? null,
  has_chart: !!f.chart, discussed_in: f.discussed_in,
})));
// figure files a reader can download: data + script, exactly as they ship in the pack
for (const f of figures) for (const rel of [f.data, f.script]) {
  if (rel && fs.existsSync(path.join(PACK, rel))) emit(`public/figures/${path.basename(rel)}`, fs.readFileSync(path.join(PACK, rel)));
}
const imgDir = path.join(PACK, 'figures/images');
if (fs.existsSync(imgDir)) for (const f of fs.readdirSync(imgDir)) emit(`public/figures/${f}`, fs.readFileSync(path.join(imgDir, f)));

// references: a slim index in the first chunk the notepad/search need; full cards in shards of 100, loaded on demand
const recordsCiting = (n: number) => [...(citedFrom.get(n) ?? [])].filter((k) => recordKeys.has(k));
const SHARD = 100;
const shards = new Map<number, unknown[]>();
for (const r of references) {
  const k = Math.floor((r.n - 1) / SHARD);
  if (!shards.has(k)) shards.set(k, []);
  shards.get(k)!.push({ ...r, cited_sections: refSections.get(r.n) ?? [], cited_records: recordsCiting(r.n), cited_elsewhere: [...(citedFrom.get(r.n) ?? [])].filter((k2) => !recordKeys.has(k2) && !k2.startsWith('sections/')) });
}
const shardDir = path.join(OUT, 'src/data/refs');
if (fs.existsSync(shardDir)) for (const f of fs.readdirSync(shardDir)) if (!shards.has(Number(/^r(\d+)\.json$/.exec(f)?.[1] ?? -1))) fs.unlinkSync(path.join(shardDir, f));
for (const [k, list] of shards) emitJson(D(`refs/r${k}.json`), list);
emitJson(D('references-index.json'), references.map((r) => ({
  n: r.n, key: r.key, year: r.year, tier: r.tier, publisher: r.publisher, source_kind: r.source_kind, read: r.read,
  verified: r.verified, rechecked: !!r.rechecked && !r.recheck,
  citation: r.citation.length > 120 ? `${r.citation.slice(0, 120).replace(/\s+\S*$/, '')}…` : r.citation,
  cited_sections: refSections.get(r.n) ?? [], cited: citedFrom.has(r.n),
})));
emitJson(D('todo.json'), todo.map((t) => ({ id: t.id, kind: t.kind, where: t.where, what: t.what })));
emitJson(D('synthesis.json'), parsed.synthesis);
if (scope) emitJson(D('scope.json'), { ...scope, search_strategy: { ...scope.search_strategy, queries: undefined, query_count: scope.search_strategy.queries.length } });
emitJson(D('queries.json'), queries);

// records
const gateGroup = new Map(records.gates.map((g) => [g.id, classifyGate(g as unknown as { id: string; name: string; applies_when: string })]));
for (const file of RECORD_FILES) {
  const out = linkedRecords[file].map((r) => {
    const extra: Record<string, unknown> = { changes: changedBy.get(r.id)?.filter(() => true) ?? [] };
    if (file === 'gates') { extra.routes = gateRoutes.get(r.id) ?? []; extra.programs_requiring = gatePrograms.get(r.id) ?? []; extra.group = gateGroup.get(r.id); }
    if (file === 'programs') extra.routes = programRoutes.get(r.id) ?? [];
    if (file === 'changes') extra.affects_files = Object.fromEntries(((r.affects as string[]) ?? []).map((a) => [a, fileOfId(a)]));
    return { ...r, ...extra };
  });
  emitJson(D(`${file}.json`), out);
}
emitJson(D('gate-groups.json'), GATE_GROUPS);
// /find's saved searches: every record that carries a find_filter, nothing else
emitJson(D('saved-searches.json'), (['routes', 'programs'] as RecordFile[]).flatMap((f) => records[f].filter((r) => r.find_filter).map((r) => ({ type: f, id: r.id, name: String(r.name), find_filter: r.find_filter }))));
if (pathfinder) emitJson(D('pathfinder.json'), pathfinder);
// the front door's own small file: route names for the ranked list, and the latest five dated changes
const latestChanges = [...linkedRecords.changes].sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 5);
emitJson(D('home.json'), {
  routes: Object.fromEntries(records.routes.map((r) => [r.id, { name: r.name, family: r.family, governing_text: r.governing_text }])),
  always: Object.fromEntries((pathfinder?.always_show ?? []).map((id) => {
    const file = (['routes', 'gates', 'programs'] as RecordFile[]).find((f) => records[f].some((r) => r.id === id));
    const r = file ? records[file].find((x) => x.id === id) : undefined;
    return [id, r && file ? { type: file, name: String(r.name ?? id), to: recordPath(file, id) } : null];
  })),
  changes: latestChanges.map((c) => ({ id: c.id, date: c.date, status: c.status, basis: c.basis, what: c.what })),
  route_counts: count(records.routes, (r) => r.family as string),
});

const recordTitle = (r: AnyRecord) => String(r.name ?? r.office_name ?? r.agency ?? r.id);
function recordPath(file: RecordFile, id: string): string { return ({
  routes: `/routes/${id}`, programs: `/programs/${id}`, certifications: `/status#${id}`, gates: `/gates#${id}`, buyers: `/buyers#${id}`,
  help: `/help#${id}`, primes: `/primes#${id}`, mechanics: `/how#${id}`, changes: `/changes#${id}`,
} as Record<RecordFile, string>)[file]; }
const recordsIndex = RECORD_FILES.flatMap((file) => records[file].map((r) => ({
  type: file, id: r.id, title: file === 'changes' ? `${String(r.date)} · ${String(r.what).replace(/\s*\[\d[^\]]*\]/g, '').slice(0, 90)}` : recordTitle(r),
  to: recordPath(file, r.id), family: (r.family as string | undefined) ?? null, kind: (r.kind as string | undefined) ?? null,
})));
emitJson(D('records-index.json'), recordsIndex);

const TYPE_WORD: Record<RecordFile, string> = { routes: 'Route', programs: 'Program', certifications: 'Certification', gates: 'Gate', buyers: 'Buyer', help: 'Help', primes: 'Prime', mechanics: 'How it works', changes: 'Change' };
emitJson(D('search.json'), [
  ...glossary.map((t) => ({ kind: 'term', id: t.id, title: t.term, subtitle: t.short, to: `/glossary#${t.id}`, hay: `${t.term} ${t.variants.join(' ')} ${t.short}`.toLowerCase() })),
  ...concepts.map((c) => ({ kind: 'concept', id: c.id, title: c.title, subtitle: c.one_liner, to: `/concepts/${c.id}`, hay: `${c.title} ${c.one_liner}`.toLowerCase() })),
  ...figures.map((f) => ({ kind: 'figure', id: f.id, title: `${f.label} · ${f.title}`, subtitle: f.kind, to: `/figures/${f.id}`, hay: `${f.label} ${f.title} ${f.kind}`.toLowerCase() })),
  ...parsed.sections.map((s) => ({ kind: 'section', id: s.id, title: s.title, subtitle: `Section · ${s.words} words`, to: `/read#${s.id}`, hay: `${s.title} ${s.number ?? ''}`.toLowerCase() })),
  ...RECORD_FILES.filter((f) => f !== 'mechanics' || true).flatMap((file) => records[file].map((r) => {
    const title = file === 'changes' ? recordsIndex.find((x) => x.type === file && x.id === r.id)!.title : recordTitle(r);
    const what = typeof r.what === 'string' ? r.what : Array.isArray(r.what) ? String(r.what[0] ?? '') : '';
    return { kind: file, id: r.id, title, subtitle: `${TYPE_WORD[file]}${r.family ? ` · ${manifest?.extensions.families[String(r.family)] ?? r.family}` : ''}`, to: recordPath(file, r.id), hay: `${title} ${r.id} ${String(r.acronym ?? '')} ${what.replace(/\[[\d,\s–-]+\]/g, '').slice(0, 300)}`.toLowerCase() };
  })),
]);

// ───────────────────────── provenance
const bodyText = body.replace(/<!--[\s\S]*?-->/g, ' ');
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const rawOccurs = (t: GlossaryEntry) => [t.term, ...t.variants].some((v) => new RegExp(`(?<![\\w-])${escapeRe(v)}(?![\\w-])`, 'i').test(bodyText));
const occurring = glossary.filter(rawOccurs);
const linkedTerms = glossary.filter((t) => (appearsIn.get(t.id) ?? []).length > 0);
const unmatched = glossary.filter((t) => !rawOccurs(t)).map((t) => t.id);
const occurringNotLinked = occurring.filter((t) => !linkedTerms.includes(t)).map((t) => t.id);
const reachable = glossary.filter((t) => (appearsIn.get(t.id) ?? []).length || (inRecords.get(t.id) ?? []).length || (inConcepts.get(t.id) ?? []).length).length;
const cited = references.filter((r) => citedFrom.has(r.n));
const recheckedRefs = references.filter((r) => !!r.rechecked && !r.recheck);

const provenance = {
  slug: manifest?.slug ?? null,
  mode: manifest?.mode ?? 'manuscript',
  as_of: manifest?.as_of ?? null,
  builder: manifest?.builder ?? null,
  sections: parsed.sections.length,
  words,
  blocks: { ...parsed.blocks, uncited: parsed.uncited.length },
  synthesis_passages: parsed.synthesis.length,
  concept_uncited: conceptUncited.length,
  record_prose: { items: recordCheck.proseItems, cited: recordCheck.proseCited, framing: recordCheck.proseFraming, uncited: recordCheck.uncited.length },
  terms: {
    total: glossary.length,
    occurring: occurring.length,
    linked: linkedTerms.length,
    linked_pct_of_occurring: occurring.length ? Math.round((linkedTerms.length / occurring.length) * 1000) / 10 : 0,
    unmatched,
    occurring_not_linked: occurringNotLinked,
    linked_in_records: inRecords.size,
    reachable_anywhere: reachable,
    by_domain: count(glossary, (t) => t.domain),
    link_every_occurrence: everyOccurrence,
    variants: matcher.variants,
    ambiguous_variants: ambiguous,
  },
  references: {
    total: references.length,
    by_tier: count(references, (r) => r.tier),
    by_source_kind: count(references, (r) => r.source_kind),
    by_read: count(references, (r) => r.read),
    cited: cited.length,
    cited_in_review: parsed.citations.filter((n) => refNs.has(n)).length,
    cited_only_from_records: cited.filter((r) => [...citedFrom.get(r.n)!].every((k) => recordKeys.has(k))).length,
    never_cited: neverCited.length,
    rechecked: recheckedRefs.length,
    recheck_pending: references.filter((r) => r.recheck).length,
    recheck_pending_cited: references.filter((r) => r.recheck && citedFrom.has(r.n)).map((r) => r.n),
    with_dropped_quotes: references.filter((r) => r.dropped_quotes.length).length,
    dropped_quotes: references.reduce((a, r) => a + r.dropped_quotes.length, 0),
    quotes: references.reduce((a, r) => a + r.quotes.length, 0),
    key_facts: references.reduce((a, r) => a + r.key_facts.length, 0),
    key_facts_contradicted: references.reduce((a, r) => a + r.key_facts.filter((k) => /^\[CONTRADICTED/i.test(k)).length, 0),
    key_facts_unconfirmed: references.reduce((a, r) => a + r.key_facts.filter((k) => /^\[unconfirmed/i.test(k)).length, 0),
    verified: references.filter((r) => r.verified).length,
    unverified: references.filter((r) => !r.verified).map((r) => r.n),
    unverified_but_cited: unverifiedButCited,
    unresolved_citations: unresolvedCitations,
  },
  figures: { total: figures.length, by_kind: count(figures, (f) => f.kind), by_synthesis: count(figures, (f) => f.synthesis), original_image: figures.filter((f) => f.kind === 'image').length },
  concepts: concepts.length,
  records: Object.fromEntries(RECORD_FILES.map((f) => [f, records[f].length])),
  records_detail: {
    programs_by_kind: count(records.programs, (p) => p.kind as string),
    programs_unconfirmed: records.programs.filter((p) => p.status === 'unconfirmed' || p.status === '' || p.status === 'empty').map((p) => p.id),
    routes_by_family: count(records.routes, (r) => r.family as string),
    routes_with_find_filter: records.routes.filter((r) => r.find_filter).length,
    changes_by_status: count(records.changes, (c) => c.status as string),
    changes_by_basis: count(records.changes, (c) => c.basis as string),
    gates_by_group: count(records.gates, (g) => gateGroup.get(g.id)?.group),
  },
  queries: { total: queries.length, hits: queries.reduce((a, q) => a + q.hits, 0), by_slice: count(queries, (q) => q.slice), zero_hit: queries.filter((q) => q.hits === 0).length },
  pathfinder: pathfinder ? { questions: pathfinder.questions.length, routes: pathfinder.routes.length, always_show: pathfinder.always_show } : null,
  scope: scope ? { queries: scope.search_strategy.queries.length, sources: scope.search_strategy.sources.length, known_gaps: scope.search_strategy.known_gaps.length } : null,
  todo: { count: todo.length, by_kind: count(todo, (t) => t.kind) },
  voice: { count: voice.length, items: voice },
  build_errors: errors.length,
  warnings,
};
emitJson('public/provenance.json', provenance);
emitJson(D('provenance.json'), provenance);

// ───────────────────────── errors: BUILD-ERRORS.md + build-errors.json
const errFile = path.join(PACK, 'BUILD-ERRORS.md');
if (errors.length) {
  const md = [
    `# BUILD-ERRORS`, '',
    `\`scripts/build-content.ts\` found ${errors.length} error(s) on ${new Date().toISOString().slice(0, 10)}. The pack was not modified; fix these in the pack and re-run \`npm run build:content\`. The app was built from whatever validated, and these errors are listed on /methods.`,
    'Uncited prose is never repaired by adding a citation, and an unknown id is never re-pointed at a similar one — inventing provenance is worse than shipping the error (APP-SPEC §6.1).', '',
    ...errors.map((e) => `- **${e.where}** — ${e.message}`), '',
  ].join('\n');
  if (!fs.existsSync(errFile) || fs.readFileSync(errFile, 'utf8').replace(/ on \d{4}-\d\d-\d\d\./, '') !== md.replace(/ on \d{4}-\d\d-\d\d\./, '')) fs.writeFileSync(errFile, md);
} else if (fs.existsSync(errFile)) fs.unlinkSync(errFile);
emitJson(D('build-errors.json'), errors);

// ───────────────────────── 8. summary
console.log(`\ncontent build — ${manifest?.slug ?? '(no manifest)'} · mode ${manifest?.mode ?? '?'} · as of ${manifest?.as_of ?? '?'}`);
console.table([
  { item: 'sections', value: parsed.sections.length },
  { item: 'words', value: words },
  { item: 'blocks (cited/framing/synthesis)', value: `${parsed.blocks.total} (${parsed.blocks.cited}/${parsed.blocks.framing}/${parsed.blocks.synthesis})` },
  { item: 'uncited blocks (review / concepts / records)', value: `${parsed.uncited.length} / ${conceptUncited.length} / ${recordCheck.uncited.length}` },
  { item: 'glossary terms', value: glossary.length },
  { item: '  occurring / linked', value: `${occurring.length} / ${linkedTerms.length} (${provenance.terms.linked_pct_of_occurring}%)` },
  { item: '  not occurring in review', value: unmatched.length },
  { item: '  reachable (review, records or 101s)', value: reachable },
  { item: 'concepts', value: concepts.length },
  { item: 'figures', value: `${figures.length} (${Object.entries(provenance.figures.by_kind).map(([k, v]) => `${k} ${v}`).join(', ')})` },
  { item: 'references', value: `${references.length} (${Object.entries(provenance.references.by_tier).map(([k, v]) => `${k} ${v}`).join(', ')})` },
  { item: '  cited / never cited', value: `${cited.length} / ${neverCited.length}` },
  { item: '  rechecked / pending', value: `${recheckedRefs.length} / ${provenance.references.recheck_pending}` },
  ...RECORD_FILES.map((f) => ({ item: `records: ${f}`, value: records[f].length })),
  { item: 'queries', value: queries.length },
  { item: 'todo items', value: todo.length },
  { item: 'voice notes', value: voice.length },
  { item: 'warnings', value: warnings.length },
  { item: 'errors', value: errors.length },
]);
const changedFiles = written.filter((w) => w.status === 'written');
console.log(`${written.length} outputs, ${changedFiles.length} rewritten${changedFiles.length ? ': ' + changedFiles.map((w) => w.file).join(', ') : ''}`);
if (warnings.length) console.log('warnings:\n' + warnings.slice(0, 40).map((w) => '  WARN ' + w).join('\n') + (warnings.length > 40 ? `\n  … ${warnings.length - 40} more (all in provenance.json)` : ''));
if (errors.length) {
  console.error(`\n${errors.length} error(s) — written to ${path.relative(ROOT, errFile)}:`);
  for (const e of errors) console.error(`  ERROR ${e.where}: ${e.message}`);
  process.exit(1);
}
console.log('\n0 errors.');
