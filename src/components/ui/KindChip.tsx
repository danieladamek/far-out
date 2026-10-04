/** The glossary's own `domain` (law | program | process | status | organisation | notation): text, not colour. */
export default function KindChip({ kind }: { kind: string }) {
  return <span className="bx-chip border border-[color:var(--bx-line)] bx-muted">{kind}</span>;
}
