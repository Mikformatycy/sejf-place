/**
 * The model's assessment of one entry, with a safety floor: the model may describe the
 * situation in its own words, but it can never rate it lower than the hard danger signs
 * (src/legal/severity.ts) - e.g. strangling is always the highest level.
 */
import type { AiLevel, AssessmentResponse } from '@/ai/client';

import type { Severity, SeverityLevel } from './severity';

const FROM_AI: Record<AiLevel, SeverityLevel | null> = { zagrozenie: 3, powazne: 2, niepokojace: 1, brak: null };

export interface Assessment extends Severity {
  explanation: string;
  /** True when the floor raised the model's level. */
  raised: boolean;
}

export function combineAssessment(ai: AssessmentResponse, floor: Severity | null): Assessment | null {
  const aiLevel = FROM_AI[ai.level];
  if (floor && (aiLevel === null || floor.level > aiLevel)) {
    // The model under-rated it: keep the stricter wording and say what was recognised.
    return { ...floor, explanation: ai.explanation, markers: [...new Set([...floor.markers, ...ai.markers])].slice(0, 6), raised: true };
  }
  if (aiLevel === null) return null;
  return { level: aiLevel, title: ai.title, message: ai.message, markers: ai.markers, explanation: ai.explanation, raised: false };
}
