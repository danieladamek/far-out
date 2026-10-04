import type { FindFilter } from '@/types';

/** Encode a record's saved search as /find URL state (keywords any-of, feed, types). */
export function findHref(f: FindFilter, label: string, routeId?: string): string {
  const p = new URLSearchParams();
  if (routeId) p.set('saved', routeId);
  p.set('label', label);
  if (f.feed && f.feed !== 'both') p.set('feed', f.feed);
  if (f.keywords?.length) p.set('any', f.keywords.join('|'));
  if (f.types?.length) p.set('type', f.types.join('|'));
  if (f.naics?.length) p.set('naics', f.naics.join('|'));
  if (f.set_aside?.length) p.set('setaside', f.set_aside.join('|'));
  return `/find?${p.toString()}`;
}
