import { useEffect, useState } from 'react';
import type { Change, Concept, Figure, Gate, GlossaryEntry, Pathfinder, Program, RecordBase, Reference, Route, Section, TodoItem } from '@/types';
import type scopeJson from '@/data/scope.json';

/** Full data files as separate chunks in dist/ (still no runtime fetch of external content). */
const cache = new Map<string, Promise<unknown>>();
function once<T>(key: string, load: () => Promise<T>): Promise<T> {
  if (!cache.has(key)) cache.set(key, load());
  return cache.get(key) as Promise<T>;
}
export const loadGlossary = () => once('glossary', () => import('@/data/glossary.json').then((m) => m.default as unknown as GlossaryEntry[]));
export const loadConcepts = () => once('concepts', () => import('@/data/concepts.json').then((m) => m.default as unknown as Concept[]));
export const loadFigures = () => once('figures', () => import('@/data/figures.json').then((m) => m.default as unknown as Figure[]));
const FIGS = import.meta.glob('../data/figures/*.json', { import: 'default' }) as Record<string, () => Promise<unknown>>;
/** One figure's full record (its own chunk). */
export const loadFigure = (id: string) => { const k = `../data/figures/${id}.json`; return FIGS[k] ? once(k, FIGS[k] as () => Promise<Figure>) : Promise.resolve(null); };
export const loadSections = () => once('sections', () => import('@/data/sections.json').then((m) => m.default as unknown as Section[]));
export const loadScope = () => once('scope', () => import('@/data/scope.json').then((m) => m.default as typeof scopeJson));
export const loadTodo = () => once('todo', () => import('@/data/todo.json').then((m) => m.default as unknown as TodoItem[]));

export const loadRoutes = () => once('routes', () => import('@/data/routes.json').then((m) => m.default as unknown as Route[]));
export const loadPrograms = () => once('programs', () => import('@/data/programs.json').then((m) => m.default as unknown as Program[]));
export const loadGates = () => once('gates', () => import('@/data/gates.json').then((m) => m.default as unknown as Gate[]));
export const loadCertifications = () => once('certifications', () => import('@/data/certifications.json').then((m) => m.default as unknown as RecordBase[]));
export const loadBuyers = () => once('buyers', () => import('@/data/buyers.json').then((m) => m.default as unknown as RecordBase[]));
export const loadHelp = () => once('help', () => import('@/data/help.json').then((m) => m.default as unknown as RecordBase[]));
export const loadPrimes = () => once('primes', () => import('@/data/primes.json').then((m) => m.default as unknown as RecordBase[]));
export const loadMechanics = () => once('mechanics', () => import('@/data/mechanics.json').then((m) => m.default as unknown as RecordBase[]));
export const loadChanges = () => once('changes', () => import('@/data/changes.json').then((m) => m.default as unknown as Change[]));
export const loadPathfinder = () => once('pathfinder', () => import('@/data/pathfinder.json').then((m) => m.default as unknown as Pathfinder));

/* references: 100 per shard, each its own chunk; a fold-out loads one shard, /references loads them all */
const SHARDS = import.meta.glob('../data/refs/r*.json', { import: 'default' }) as Record<string, () => Promise<unknown>>;
const shardOf = (n: number) => `../data/refs/r${Math.floor((n - 1) / 100)}.json`;
export function loadReference(n: number): Promise<Reference | null> {
  const key = shardOf(n);
  const load = SHARDS[key];
  if (!load) return Promise.resolve(null);
  return once(key, load as () => Promise<Reference[]>).then((rs) => rs.find((r) => r.n === n) ?? null);
}
export const loadReferences = () => once('references:all', () => Promise.all(Object.keys(SHARDS).map((k) => once(k, SHARDS[k] as () => Promise<Reference[]>))).then((parts) => parts.flat().sort((a, b) => a.n - b.n)));

/** Resolve a loader into state; `undefined` while loading. */
export function useAsync<T>(load: () => Promise<T>): T | undefined {
  const [v, setV] = useState<T | undefined>(undefined);
  useEffect(() => { let live = true; load().then((x) => { if (live) setV(x); }); return () => { live = false; }; }, [load]);
  return v;
}
