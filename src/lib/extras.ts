import referencesIndexJson from '@/data/references-index.json';
import type { ReferenceMeta } from '@/types';
export { recordsIndex } from '@/lib/records';

/** The reference index (1,427 rows) only some routes need: /references, /notes, the notepad's anchors. Its own chunk. */
export const referencesIndex = referencesIndexJson as unknown as ReferenceMeta[];
