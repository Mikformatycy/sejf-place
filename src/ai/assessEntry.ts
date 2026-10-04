import { formLabel } from '@/content/formy';
import { combineAssessment, type Assessment } from '@/legal/assessment';
import { toHintEntry } from '@/legal/hints';
import { assessSeverity } from '@/legal/severity';
import type { VaultIndex } from '@/vault/types';

import { requestAssessment } from './client';
import { makePseudonymizer } from './pseudonymize';

/**
 * Asks the model how serious one saved entry is, with names pseudonymised. The hard rules
 * still set a floor (a model cannot rate strangulation as harmless). null: no violence recognised.
 */
export async function assessEntry(index: VaultIndex, id: string): Promise<Assessment | null> {
  const content = index.entries.find((e) => e.id === id)?.content;
  if (!content) return null;
  const entry = toHintEntry(content);
  const others = index.entries.filter((e) => e.content && e.id !== id);
  // The app no longer asks about a firearm; an answer left from an older version is ignored.
  const profile = { ...index.profile, firearm: '' as const };
  const ctx = { entry, history: others.map((e) => toHintEntry(e.content!)), profile };
  const pseudo = makePseudonymizer(index.profile.namesToHide);
  const r = await requestAssessment({
    entry: {
      date: content.occurredAt,
      forms: content.forms.map(formLabel),
      description: pseudo.hide(content.description),
      injuries: content.injuries,
      childrenPresent: content.childrenPresent,
    },
    history: others.slice(-10).map((e) => ({ date: e.content!.occurredAt, forms: e.content!.forms.map(formLabel), description: pseudo.hide(e.content!.description).slice(0, 600) })),
    firearm: '',
  });
  const restored = { ...r, title: pseudo.restore(r.title), message: pseudo.restore(r.message), explanation: pseudo.restore(r.explanation), markers: r.markers.map(pseudo.restore) };
  return combineAssessment(restored, assessSeverity(ctx));
}
