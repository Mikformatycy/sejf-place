import type { Attachment, Entry, ViolenceForm } from './types';

/** Form fields of the entry being written. */
export interface DraftFields {
  date: string;
  time: string;
  place: string;
  forms: ViolenceForm[];
  tags: string[];
  description: string;
  injuries: boolean | null;
  injuriesDescription: string;
  witnesses: string;
  childrenPresent: boolean | null;
  isFirst: boolean;
  /** Ticked detail -> amount as typed ("1250,50"), parsed only on save. Older drafts lack it. */
  amounts?: Record<string, string>;
}

export interface StoredDraft {
  /** 'new' or the id of the entry being corrected. */
  key: string | null;
  fields: DraftFields | null;
  attachments: Attachment[];
}

export const EMPTY_DRAFT: StoredDraft = { key: null, fields: null, attachments: [] };

/** Nothing worth keeping: no files and no text (the prefilled date alone does not count). */
export function isEmptyDraft(d: StoredDraft): boolean {
  return (
    d.attachments.length === 0 &&
    (!d.fields || (!d.fields.description.trim() && d.fields.forms.length === 0 && !d.fields.place.trim()))
  );
}

/**
 * True when a stored draft already became an entry (the app was killed before the draft
 * file was removed). Such a draft must not come back: discarding it would delete files
 * that the saved entry refers to.
 */
export function wasDraftSaved(d: StoredDraft, entries: Entry[]): boolean {
  const savedFiles = new Set(entries.flatMap((e) => e.content?.attachments.map((a) => a.id) ?? []));
  if (d.attachments.some((a) => savedFiles.has(a.id))) return true;
  const description = d.fields?.description.trim();
  return !!description && entries.some((e) => e.content?.description.trim() === description);
}
