import recordsIndexJson from '@/data/records-index.json';
import type { RecordMeta, RecordType } from '@/types';

/** Lookup for "routes/x"-style keys (reference cards, change ledgers, pathway nodes). The index is small (titles and paths). */
export const recordsIndex = recordsIndexJson as unknown as RecordMeta[];
export const recordsIndexById = new Map<string, RecordMeta>(recordsIndex.map((r) => [`${r.type}/${r.id}`, r]));
export const recordMeta = (type: RecordType, id: string) => recordsIndexById.get(`${type}/${id}`);
/** Find a record by bare id, preferring the given types in order (a change's `affects` names bare ids). */
export function findRecord(id: string, prefer: RecordType[] = ['routes', 'programs', 'gates', 'certifications', 'buyers', 'help', 'primes', 'mechanics', 'changes']): RecordMeta | undefined {
  for (const t of prefer) { const m = recordsIndexById.get(`${t}/${id}`); if (m) return m; }
  return undefined;
}
