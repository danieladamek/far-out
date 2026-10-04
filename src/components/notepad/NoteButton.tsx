import { useNotepad } from '@/lib/notepad-context';
import type { Anchor } from '@/lib/notepad';

/** "✎ Note" on anything the app renders: adds a note anchored to it and opens the notepad (APP-SPEC §3.1). */
export default function NoteButton({ anchor, label, quote, className = '' }: { anchor: Anchor; label: string; quote?: string; className?: string }) {
  const np = useNotepad();
  return (
    <button type="button" className={`bx-btn !py-0.5 !px-2 text-xs ${className}`} onClick={() => { np.addNote(anchor, quote); np.setOpen(true); }} aria-label={`Add a note on ${label}`} data-testid={`note-on-${anchor.type}-${anchor.id}`}>
      <span aria-hidden="true">✎</span> Note
    </button>
  );
}
