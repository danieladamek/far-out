/**
 * Zod schemas mirroring docs/CONTENT-PACK.md (topic mode) and content-pack/EXTENSIONS.md (FAR Out's extension
 * files). The standard files are validated closely; the extension records have grown keys beyond the schema draft
 * (KICKOFF §3.1 lists them), so they are `.passthrough()` — but every id reference and every `[n]` in them must
 * resolve, which scripts/lib/records.ts checks after parsing.
 */
import { z } from 'zod';

export const kebab = z.string().regex(/^[a-z0-9-]+$/, 'must be kebab-case');
const url = z.string().regex(/^https?:\/\//, 'must be an http(s) URL');

/* ───────────────────────── vocabularies */

export const FAMILIES = ['sbir-sttr', 'setaside-vehicle', 'partnering', 'ot-cso'] as const;
export const SITUATIONS = ['not-yet-registered', 'registered-no-award', 'first-awards-grow', 'have-technology', 'looking-for-partners'] as const;
export const FEEDS = ['sam', 'grants', 'both', 'none'] as const;
export const CHANGE_STATUSES = ['proposed', 'announced', 'class-deviation', 'final', 'pending-implementation'] as const;
export const DOMAINS = ['law', 'program', 'process', 'status', 'organisation', 'notation'] as const;
export type Family = (typeof FAMILIES)[number];
export type Situation = (typeof SITUATIONS)[number];

/* ───────────────────────── manifest */

export const ManifestSchema = z
  .object({
    mode: z.enum(['manuscript', 'topic']).default('manuscript'),
    slug: kebab,
    title: z.string().min(1),
    short_title: z.string().min(1),
    question: z.string().optional(),
    purpose: z.string().optional(),
    as_of: z.string().optional(),
    authors: z.array(z.string().min(1)).min(1),
    venue: z.string().min(1),
    year: z.number().int(),
    doi: z.string().optional(),
    url: z.string().optional(),
    plain_abstract: z.string().default(''),
    reading_minutes: z.number().optional(),
    audience: z.string().optional(),
    palette: z.object({ groups: z.record(z.string()) }).default({ groups: {} }),
    permissions: z.object({
      text: z.string().min(1, 'permissions.text is REQUIRED — no pack ships without it'),
      figures: z.string().optional(),
    }),
    delivery: z.enum(['local', 'pages']).default('local'),
    notes_storage: z.enum(['file', 'browser']).default('file'),
    link_every_occurrence: z.boolean().default(false),
    builder: z.object({ name: z.string(), version: z.string(), date: z.string() }),
    github_account: z.string().min(1),
    disclaimer: z.string().min(1, 'disclaimer is required — it is rendered in every footer'),
    extensions: z
      .object({
        record_files: z.array(z.string()).default([]),
        schema: z.string().optional(),
        pathfinder: z.string().optional(),
        families: z.record(z.string()),
      })
      .passthrough(),
    opportunity_search: z
      .object({
        harvest: z.array(z.string()).default([]),
        live: z.array(z.string()).default([]),
        links_only: z.array(z.string()).default([]),
        note: z.string().default(''),
      })
      .passthrough()
      .optional(),
  })
  .superRefine((m, ctx) => {
    if (m.mode === 'topic') {
      for (const k of ['question', 'purpose', 'as_of'] as const) {
        if (!m[k]) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [k], message: `${k} is REQUIRED in topic mode` });
      }
      if (!/peer/i.test(m.venue)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['venue'], message: 'topic mode: venue must make the non-peer-reviewed status unmissable' });
    } else if (!(m.doi || m.url)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'doi or url required' });
    }
    if (m.delivery === 'pages' && !/25 words/.test(m.permissions.text)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['permissions', 'text'], message: 'delivery: pages needs permissions.text to state the quotation rule (≤ 25 words)' });
    }
    for (const f of FAMILIES) {
      if (!m.palette.groups[f]) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['palette', 'groups'], message: `palette.groups needs a colour for family ${f}` });
      if (!m.extensions.families[f]) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['extensions', 'families'], message: `extensions.families needs a label for ${f}` });
    }
  });
export type Manifest = z.infer<typeof ManifestSchema>;

/* ───────────────────────── glossary, concepts, figures */

/** `kind` is the builder vocabulary (science | methods | statistics | notation); `domain` is this pack's own. */
export const GlossaryEntrySchema = z.object({
  id: kebab,
  term: z.string().min(1),
  kind: z.enum(['science', 'methods', 'statistics', 'notation']),
  domain: z.enum(DOMAINS),
  variants: z.array(z.string().min(1)).default([]),
  short: z.string().min(1).max(200, 'short > 200 chars'),
  definition: z.string().min(1),
  concept: kebab.nullable().optional().transform((v) => v ?? undefined),
  see: z.array(kebab).default([]),
  sources: z.array(z.string()).default([]),
}).strict();
export const GlossarySchema = z.array(GlossaryEntrySchema);
export type GlossaryEntry = z.infer<typeof GlossaryEntrySchema>;

export const ConceptFrontmatterSchema = z.object({
  id: kebab,
  title: z.string().min(1),
  one_liner: z.string().min(1),
  why_here: z.string().min(1),
  prerequisites: z.array(kebab).default([]),
  terms: z.array(kebab).default([]),
  figures: z.array(kebab).default([]),
  further_reading: z
    .array(z.object({ title: z.string().min(1), url: z.string().min(1), kind: z.string().optional() }))
    .min(2, 'needs ≥2 further_reading'),
  self_check: z
    .array(
      z
        .object({ q: z.string().min(1), options: z.array(z.string()).min(2), answer: z.number().int(), explanation: z.string().default('') })
        .refine((q) => q.answer >= 0 && q.answer < q.options.length, { message: 'self_check answer index out of range (0-based)' }),
    )
    .min(1, 'needs ≥1 self_check'),
});
export type ConceptFrontmatter = z.infer<typeof ConceptFrontmatterSchema>;

export const FIGURE_KINDS = ['chart', 'table', 'network', 'pathway', 'image'] as const;
export const CHART_TYPES = ['line', 'bar', 'grouped-bar', 'stacked-bar', 'scatter', 'area', 'step', 'box', 'heatmap', 'forest'] as const;
const AxisSchema = z.object({
  field: z.string().optional(),
  label: z.string().optional(),
  unit: z.string().optional(),
  scale: z.enum(['linear', 'log']).optional(),
});
/** `series` is a field name, or `{ field, label }` (this pack writes the latter). Normalised to the object form. */
const SeriesSchema = z.union([z.string(), z.object({ field: z.string(), label: z.string().optional() })])
  .transform((s) => (typeof s === 'string' ? { field: s, label: undefined as string | undefined } : s));
export const ChartSpecSchema = z.object({
  type: z.enum(CHART_TYPES),
  x: AxisSchema.optional(),
  y: AxisSchema.optional(),
  series: SeriesSchema.optional(),
  ci: z.tuple([z.string(), z.string()]).optional(),
});
export const ExplainSchema = z.object({ on: z.string().min(1), text: z.string().min(1), term: kebab.optional(), concept: kebab.optional() });
export const HotspotSchema = z.object({ x: z.number(), y: z.number(), w: z.number(), h: z.number(), text: z.string().min(1), term: kebab.optional() });
export const FigureSchema = z.object({
  id: kebab,
  label: z.string().min(1),
  title: z.string().min(1),
  kind: z.enum(FIGURE_KINDS),
  synthesis: z.enum(['data', 'conceptual']).optional(),
  refs: z.array(z.number().int()).default([]),
  data: z.string().optional(),
  script: z.string().optional(),
  image: z.string().optional(),
  columns: z.array(z.object({ field: z.string(), label: z.string().optional() })).optional(),
  chart: ChartSpecSchema.optional(),
  caption: z.string().min(1),
  how_to_read: z.string().min(1),
  explain: z.array(ExplainSchema).default([]),
  hotspots: z.array(HotspotSchema).default([]),
  concepts: z.array(kebab).default([]),
  discussed_in: z.array(z.string()).default([]),
  source: z.string().min(1),
});
export const FiguresSchema = z.array(FigureSchema);
export type FigureDef = z.infer<typeof FigureSchema>;

/**
 * Pathway JSON (KICKOFF §3.4): nodes carry `col`/`row` for the fixed layout and may link to a record
 * (`record: "gates/sam-registration-uei"`, or `route`/`program`/`gate` ids); edges use `from`/`to`.
 */
export const PathwaySchema = z.object({
  id: z.string().optional(),
  note: z.string().default(''),
  nodes: z.array(z.object({
    id: z.string().min(1),
    kind: z.string().min(1),
    label: z.string().min(1),
    col: z.number(),
    row: z.number(),
    refs: z.array(z.number().int()).default([]),
    record: z.string().optional(),
    route: z.string().optional(),
    program: z.string().optional(),
    gate: z.string().optional(),
    family: z.string().optional(),
    situation: z.string().optional(),
    situations: z.array(z.string()).default([]),
    governing_text: z.string().optional(),
    detail: z.string().optional(),
  }).strict()).min(1),
  edges: z.array(z.object({
    from: z.string(), to: z.string(), kind: z.string().optional(), label: z.string().optional(),
    refs: z.array(z.number().int()).default([]), routes: z.array(z.string()).default([]),
  }).strict()),
});
export type Pathway = z.infer<typeof PathwaySchema>;

/* ───────────────────────── references (topic schema + web-source keys, EXTENSIONS.md) */

export const REF_ROLES = ['support', 'method', 'contrast', 'prior-result', 'data-source', 'background'] as const;
export const REF_TIERS = ['seminal', 'classic', 'current', 'background'] as const;

export const ReferenceSchema = z
  .object({
    n: z.number().int().positive(),
    key: z.string().min(1),
    tier: z.enum(REF_TIERS),
    citation: z.string().min(1),
    url: url,
    final_url: z.string().optional(),
    year: z.number().int(),
    published: z.union([z.string(), z.date()]).transform((v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v)),
    page_date: z.union([z.string(), z.date()]).optional().transform((v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v)),
    date_note: z.string().optional(),
    accessed: z.union([z.string(), z.date()]).transform((v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v)),
    publisher: z.string().min(1),
    source_kind: z.enum(['primary', 'secondary']),
    read: z.enum(['full', 'partial', 'not-fetched']),
    summary: z.string().default(''),
    why_it_mattered: z.string().default(''),
    key_facts: z.array(z.string()).default([]),
    quotes: z.array(z.string()).default([]),
    dropped_quotes: z.array(z.object({ quote: z.string(), verdict: z.string().optional() }).passthrough()).default([]),
    role_here: z.enum(REF_ROLES),
    role_note: z.string().default(''),
    cited_in: z.array(z.string()).default([]),
    verified: z.boolean(),
    recheck: z.boolean(),
    rechecked: z.union([z.string(), z.date()]).optional().transform((v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v)),
    recheck_note: z.string().optional(),
    prev_n: z.union([z.number().int(), z.array(z.number().int())]).optional(),
    tier_note: z.string().optional(),
  })
  .strict()
  .superRefine((r, ctx) => {
    const issue = (message: string, path: (string | number)[] = []) => ctx.addIssue({ code: z.ZodIssueCode.custom, message, path });
    if (!r.summary.trim() && r.verified) issue('no summary (a missing summary is allowed only with verified: false)');
    if (r.read === 'not-fetched' && r.verified) issue('read: not-fetched cannot be verified: true', ['read']);
    if (r.tier === 'seminal' && !r.why_it_mattered.trim()) issue('seminal tier needs why_it_mattered', ['why_it_mattered']);
  });
export const ReferencesSchema = z.array(ReferenceSchema);
export type Reference = z.infer<typeof ReferenceSchema>;

export const TodoSchema = z.array(z.object({
  id: z.string().min(1),
  kind: z.enum(['gap', 'conflict', 'unverified', 'recheck']),
  about: z.string().default(''),
  text: z.string().default(''),
  owner: z.string().default('author'),
  where: z.string().min(1),
  what: z.string().min(1),
}).passthrough());
export type TodoItem = z.infer<typeof TodoSchema>[number];

/* ───────────────────────── scope.yaml + queries.yaml — published content, rendered by /methods */

export const ScopeSchema = z.object({
  topic: z.string().min(1),
  question: z.string().min(1),
  purpose: z.string().optional(),
  boundary: z.object({
    in: z.array(z.string()).min(1, 'boundary.in is empty — the scope must say what is in'),
    out: z.array(z.string()).min(1, 'boundary.out is empty — the scope must say what was deliberately left out'),
    rationale: z.string().default(''),
  }),
  level: z.string().optional(),
  time_window: z.object({ current_from: z.number().int().optional(), seminal: z.string().optional() }),
  stance: z.string().optional(),
  depth: z.enum(['brief', 'standard', 'deep']),
  anchors: z.array(z.object({ citation: z.string(), doi: z.string().optional(), url: z.string().optional(), why: z.string().default('') })).default([]),
  excluded: z.array(z.object({ what: z.string(), why: z.string().default('') })).default([]),
  assumed: z.boolean().default(false),
  assumptions: z.array(z.string()).default([]),
  interview: z.array(z.object({ q: z.string(), answer: z.string(), asked: z.union([z.string(), z.date()]).optional().transform((v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v)) })).default([]),
  search_strategy: z.object({
    run_on: z.union([z.string(), z.date()]).transform((v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v)),
    sources: z.array(z.string()).min(1),
    queries: z.array(z.object({ q: z.string().min(1), source: z.string().optional(), hits: z.number().int(), slice: z.string().optional() }).passthrough()).min(1),
    snowball: z.array(z.string()).default([]),
    inclusion: z.array(z.string()).min(1),
    exclusion: z.array(z.string()).min(1),
    known_gaps: z.array(z.string()).default([]),
  }),
  corpus_profile: z.object({
    by_tier: z.record(z.number().int()),
    by_source_kind: z.record(z.number().int()).optional(),
    year_range: z.array(z.number().int()).optional(),
    concentration: z.string().default(''),
    dissent_represented: z.boolean().default(false),
    dissent_note: z.string().default(''),
    recheck: z.string().default(''),
  }).passthrough(),
  outline_approved: z.string().optional(),
});
export type Scope = z.infer<typeof ScopeSchema>;

export const QuerySchema = z.object({
  text: z.string().min(1),
  engine: z.string().min(1),
  hits: z.number().int().min(0),
  date: z.union([z.string(), z.date()]).transform((v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v)),
  slice: z.string().min(1),
  note: z.string().optional(),
}).strict();
export const QueriesSchema = z.array(QuerySchema);
export type Query = z.infer<typeof QuerySchema>;

/* ───────────────────────── extension records (EXTENSIONS.md; permissive, ids checked in records.ts) */

const isoish = z.union([z.string(), z.date()]).transform((v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v));
const refList = z.array(z.number().int().positive());

export const PendingChangeSchema = z.object({
  status: z.enum(CHANGE_STATUSES),
  date: isoish,
  text: z.string().min(1),
}).passthrough();

const common = {
  id: kebab,
  official_url: z.string().optional(),
  pending_changes: z.array(PendingChangeSchema).default([]),
  as_of: isoish,
  sources: refList.default([]),
  conflicts: z.array(z.string()).default([]),
};

export const FindFilterSchema = z.object({
  feed: z.enum(FEEDS),
  keywords: z.array(z.string()).default([]),
  types: z.array(z.string()).default([]),
  naics: z.array(z.string()).default([]),
  set_aside: z.array(z.string()).default([]),
}).passthrough();
export type FindFilter = z.infer<typeof FindFilterSchema>;

const stringOrList = z.union([z.string(), z.array(z.string())]);

export const RouteSchema = z.object({
  ...common,
  name: z.string().min(1),
  family: z.enum(FAMILIES),
  governing_text: z.string().min(1),
  what: z.string().min(1),
  who_for: z.string().default(''),
  how_it_works: z.array(z.string()).default([]),
  benefits: z.array(z.string()).default([]),
  requirements: z.array(z.string()).default([]),
  steps: z.array(z.string()).default([]),
  gates: z.array(z.string()).default([]),
  programs: z.array(z.string()).default([]),
  situations: z.array(z.enum(SITUATIONS)).default([]),
  modifiers: z.record(z.union([z.boolean(), z.null()])).default({}),
  find_filter: FindFilterSchema.optional(),
}).passthrough();

export const ProgramSchema = z.object({
  ...common,
  name: z.string().min(1),
  family: z.enum(FAMILIES).nullable().optional(),
  kind: z.string().min(1),
  status: z.string().nullable().optional(),
  what: z.string().optional(),
  eligibility: z.array(z.string()).default([]),
  steps: z.array(z.string()).default([]),
  gates: z.array(z.string()).default([]),
  situations: z.array(z.enum(SITUATIONS)).default([]),
  distinctive: z.string().optional(),
  find_filter: FindFilterSchema.optional(),
}).passthrough();

export const CertificationSchema = z.object({
  ...common,
  name: z.string().min(1),
  what: z.string().min(1),
  eligibility: z.array(z.string()).default([]),
  benefits: z.array(z.string()).default([]),
  steps: z.array(z.string()).default([]),
  situations: z.array(z.enum(SITUATIONS)).default([]),
}).passthrough();

export const GateSchema = z.object({
  ...common,
  name: z.string().min(1),
  what: z.string().min(1),
  applies_when: z.string().min(1),
  steps: z.array(z.string()).default([]),
  how_it_works: z.array(z.string()).default([]),
}).passthrough();

export const BuyerSchema = z.object({
  ...common,
  kind: z.string().optional(),
  name: z.string().optional(),
  agency: z.string().optional(),
  office_name: z.string().optional(),
  forecast_url: z.string().nullable().optional(),
  verified: z.boolean().optional(),
  what: z.string().optional(),
}).passthrough();

export const HelpSchema = z.object({
  ...common,
  name: z.string().min(1),
  what: z.string().min(1),
  kind: z.string().nullable().optional(),
}).passthrough();

export const PrimeSchema = z.object({
  id: kebab,
  name: z.string().min(1),
  supplier_portal_url: z.string().nullable().optional(),
  as_of: isoish,
  sources: refList.default([]),
}).passthrough();

export const MechanicSchema = z.object({
  ...common,
  name: z.string().min(1),
  what: stringOrList,
}).passthrough();

export const ChangeSchema = z.object({
  id: kebab,
  date: isoish,
  status: z.enum(CHANGE_STATUSES),
  basis: z.string().default(''),
  what: z.string().min(1),
  affects: z.array(z.string()).default([]),
  sources: refList.default([]),
}).passthrough();

export const PathfinderSchema = z.object({
  version: z.string().optional(),
  as_of: isoish.optional(),
  rule: z.string().min(1),
  questions: z.array(z.object({
    id: z.string().min(1),
    prompt: z.string().min(1),
    type: z.enum(['single', 'multi']),
    modifier: z.string().optional(),
    options: z.array(z.object({
      tag: z.enum(SITUATIONS).optional(),
      value: z.union([z.string(), z.boolean(), z.null()]).optional(),
      label: z.string().min(1),
    }).strict()).min(1),
  }).strict()).min(1),
  routes: z.array(z.object({
    id: z.string().min(1),
    family: z.enum(FAMILIES),
    situations: z.array(z.enum(SITUATIONS)).default([]),
    modifiers: z.record(z.union([z.boolean(), z.null()])).default({}),
    certs: z.array(z.string()).default([]),
  }).strict()),
  families: z.record(z.string()),
  always_show: z.array(z.string()).default([]),
  note: z.string().default(''),
}).strict();
export type Pathfinder = z.infer<typeof PathfinderSchema>;

export const RECORD_SCHEMAS = {
  routes: RouteSchema,
  programs: ProgramSchema,
  certifications: CertificationSchema,
  gates: GateSchema,
  buyers: BuyerSchema,
  help: HelpSchema,
  primes: PrimeSchema,
  mechanics: MechanicSchema,
  changes: ChangeSchema,
} as const;
export type RecordFile = keyof typeof RECORD_SCHEMAS;
export const RECORD_FILES = Object.keys(RECORD_SCHEMAS) as RecordFile[];

export interface BuildError { where: string; message: string }

/** Flatten a zod error into build errors with a stable "where" prefix. */
export function zodErrors(where: string, err: z.ZodError): BuildError[] {
  return err.issues.map((i) => ({ where: i.path.length ? `${where}/${i.path.join('/')}` : where, message: i.message }));
}
