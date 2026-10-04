// Types for scripts/harvest/lib.mjs (consumed by Vitest TypeScript tests and the app's type checks).
import type { Transform } from 'node:stream';

export declare const SAM_URL: string;
export declare const GRANTS_URL: string;
export declare const USER_AGENT: string;
export declare const SAM_COLUMNS: readonly SamColumn[];
export declare const GRANTS_COLUMNS: readonly GrantsColumn[];
export declare const EARLY_NOTICE_TYPES: Set<string>;
export declare const EARLY_NOTICE_WINDOW_DAYS: number;
export declare const EXCERPT_CHARS: number;
export declare const SHARD_MAX_BYTES: number;

export interface SamRecord {
  id: string;
  title: string;
  sol: string;
  agency: string;
  subtier: string;
  office: string;
  /** YYYY-MM-DD */
  posted: string;
  type: string;
  setAsideCode: string;
  setAside: string;
  /** YYYY-MM-DD or '' */
  deadline: string;
  naics: string;
  psc: string;
  popState: string;
  link: string;
  descExcerpt: string;
  sbir: boolean;
}
export type SamColumn = keyof SamRecord;

export interface GrantsRecord {
  id: string;
  number: string;
  title: string;
  agency: string;
  agencyCode: string;
  /** YYYY-MM-DD or '' */
  openDate: string;
  /** YYYY-MM-DD or '' */
  closeDate: string;
  oppStatus: string;
  docType: string;
  cfdaList: string[];
  /** Only the eligibility codes probed via filtered queries (23, 99); [] = none of those. */
  eligibilities: string[];
  sbir: boolean;
}
export type GrantsColumn = keyof GrantsRecord;

/** On-disk shard / grants file shape. */
export interface ColumnarFile<C extends string = string> {
  columns: C[];
  rows: unknown[][];
}

export interface ShardFile {
  file: string;
  sector: string;
  count: number;
  bytes: number;
  body: ColumnarFile<SamColumn>;
}

export interface ManifestSource {
  ok: boolean;
  url: string;
  harvestedAt: string | null;
  count: number;
  ms: number;
  bytes?: number;
  status: number | null;
  stale?: boolean;
  lastAttemptAt?: string;
}
export interface Manifest {
  harvestedAt: string | null;
  sources: { sam?: ManifestSource; grants?: ManifestSource };
  counts: { sam: number; grants: number };
  failures: { source: 'sam' | 'grants'; status: number | null; message: string; at: string }[];
  notes: string[];
}

export declare function isSbir(title: string | null | undefined): boolean;
export declare function isoDate(s: string | null | undefined): string;
export declare function addDays(iso: string, days: number): string;
export declare function todayIso(): string;
export declare function decodeMixed(buf: Uint8Array, final?: boolean): { text: string; rest: number };
export declare function mixedDecoderStream(): Transform;
export declare function excerpt(s: string | null | undefined, n?: number): string;
export declare function keepSamRow(row: Record<string, string>, opts: { today: string }): boolean;
export declare function samLink(row: Record<string, string>): string;
export declare function slimSamRow(row: Record<string, string>): SamRecord;
export declare function naicsSector(naics: string): string;
export declare function toRow<T extends object>(rec: T, columns: readonly string[]): unknown[];
export declare function parseSamCsvStream(
  readable: NodeJS.ReadableStream,
  opts?: { today?: string; decode?: boolean },
): Promise<{ header: string[]; read: number; kept: number; malformed: number; records: SamRecord[]; byType: Record<string, number> }>;
export declare function shardBySector(records: SamRecord[], opts?: { maxBytes?: number; prefix?: string }): { files: ShardFile[]; bySector: Record<string, number> };
export declare function mapGrantsHits(json: unknown, opts?: { eligibleIds?: Record<string, Set<string>> }): GrantsRecord[];
export declare function grantsHitsHaveEligibilities(json: unknown): boolean;
export declare function emptyManifest(): Manifest;
export declare function readJson<T>(path: string, fallback: T): Promise<T | any>;
export declare function writeJson(path: string, data: unknown): Promise<number>;
export declare function mergeManifest(
  manifest: Partial<Manifest> | null,
  name: 'sam' | 'grants',
  r: { ok: boolean; url: string; at: string; count?: number; ms: number; bytes?: number; status: number | null; message?: string },
  notes?: string[],
): Manifest;
