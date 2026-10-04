/**
 * The pathfinder ranking (KICKOFF §4b `/`), exactly as `pathfinder.rule` states it:
 *   score = matched situation tags (2 each) + matched modifiers (1 each); routes with score 0 are hidden;
 *   the page shows why each route matched; no route is ever recommended over another, only ranked by match count.
 *
 * How each question's answer is matched — read off the pack's own question definitions, nothing added:
 *   - the situation question (options carry `tag`): +2 when the route's `situations` include the answered tag;
 *   - a question with `modifier: offer`: +1 when the route's `modifiers[<answered value>]` is true;
 *   - a question with `modifier: defense`: +1 when the route's `modifiers.defense` equals the answer; "Either"
 *     (null) expresses no side and matches nothing;
 *   - a question with `modifier: certs` (multi): +1 for each answered certification in the route's `certs`
 *     ("None" matches nothing).
 * Ties keep the pack's own route order. Pure: no React, no storage — unit-tested on a fixture.
 */
export type AnswerValue = string | boolean | null;
export interface PfOption { tag?: string; value?: AnswerValue; label: string }
export interface PfQuestion { id: string; prompt: string; type: 'single' | 'multi'; modifier?: string; options: PfOption[] }
export interface PfRoute { id: string; family: string; situations: string[]; modifiers: Record<string, boolean | null>; certs: string[] }
export interface Pathfinder { rule: string; questions: PfQuestion[]; routes: PfRoute[]; families: Record<string, string>; always_show: string[]; note: string }

/** Answers keyed by question id: a tag/value for single questions, a list of values for multi questions. */
export type Answers = Record<string, AnswerValue | AnswerValue[] | undefined>;

export interface Reason { question: string; label: string; points: number }
export interface Ranked { id: string; family: string; score: number; reasons: Reason[]; index: number }

const optionKey = (o: PfOption): AnswerValue => (o.tag !== undefined ? o.tag : o.value ?? null);

export function scoreRoute(route: PfRoute, pf: Pick<Pathfinder, 'questions'>, answers: Answers): { score: number; reasons: Reason[] } {
  const reasons: Reason[] = [];
  for (const q of pf.questions) {
    const a = answers[q.id];
    if (a === undefined) continue;
    const labelOf = (v: AnswerValue) => q.options.find((o) => optionKey(o) === v)?.label ?? String(v);
    if (!q.modifier) {
      // the situation question
      if (typeof a === 'string' && route.situations.includes(a)) reasons.push({ question: q.prompt, label: labelOf(a), points: 2 });
      continue;
    }
    if (q.modifier === 'certs') {
      const picked = (Array.isArray(a) ? a : [a]).filter((v): v is string => typeof v === 'string' && v !== 'none');
      for (const c of picked) if (route.certs.includes(c)) reasons.push({ question: q.prompt, label: labelOf(c), points: 1 });
      continue;
    }
    if (q.modifier === 'offer') {
      if (typeof a === 'string' && route.modifiers[a] === true) reasons.push({ question: q.prompt, label: labelOf(a), points: 1 });
      continue;
    }
    // any other single-valued modifier (here: defense) matches when the route's modifier equals the answer
    if (a !== null && !Array.isArray(a) && q.modifier in route.modifiers && route.modifiers[q.modifier] === a) {
      reasons.push({ question: q.prompt, label: labelOf(a), points: 1 });
    }
  }
  return { score: reasons.reduce((s, r) => s + r.points, 0), reasons };
}

/** Every route with score > 0, highest score first, ties in the pack's order. */
export function rankRoutes(pf: Pick<Pathfinder, 'questions' | 'routes'>, answers: Answers): Ranked[] {
  return pf.routes
    .map((r, index) => ({ id: r.id, family: r.family, index, ...scoreRoute(r, pf, answers) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index);
}

/** Ranked routes grouped by family, families in the pack's order. */
export function groupByFamily(ranked: Ranked[], families: Record<string, string>): { family: string; label: string; routes: Ranked[] }[] {
  return Object.entries(families)
    .map(([family, label]) => ({ family, label, routes: ranked.filter((r) => r.family === family) }))
    .filter((g) => g.routes.length);
}

export const hasAnyAnswer = (a: Answers) => Object.values(a).some((v) => v !== undefined && !(Array.isArray(v) && v.length === 0));
