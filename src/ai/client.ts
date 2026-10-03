import { AiError } from './errors';
import { geminiJson } from './gemini';
import { ASSESS_SCHEMA, ASSESS_SYSTEM, ORGANIZE_SCHEMA, ORGANIZE_SYSTEM } from './prompts';
import type { AiItemIn } from './validate';

export interface AiRequestEntry {
  id: string;
  date: string;
  approx: boolean;
  forms: string[];
  description: string;
}

export { AiError } from './errors';

/** Neutral chronology of the selected entries (names must be pseudonymised first). */
export async function requestOrganize(entries: AiRequestEntry[]): Promise<{ model: string; items: AiItemIn[]; truncated: boolean }> {
  const r = await geminiJson<{ items?: AiItemIn[] }>(ORGANIZE_SYSTEM, JSON.stringify({ entries }), ORGANIZE_SCHEMA, 180_000);
  return { model: r.model, items: r.data.items ?? [], truncated: r.truncated };
}

export interface AssessmentRequest {
  entry: { date: string; forms: string[]; description: string; injuries: boolean | null; childrenPresent: boolean | null };
  history: { date: string; forms: string[]; description: string }[];
  firearm: string;
}

export type AiLevel = 'zagrozenie' | 'powazne' | 'niepokojace' | 'brak';

export interface AssessmentResponse {
  model: string;
  level: AiLevel;
  title: string;
  message: string;
  markers: string[];
  explanation: string;
}

/** Asks the model how serious one entry is. Names must be pseudonymised first. */
export async function requestAssessment(body: AssessmentRequest): Promise<AssessmentResponse> {
  const { data: r, model } = await geminiJson<Partial<AssessmentResponse>>(ASSESS_SYSTEM, JSON.stringify(body), ASSESS_SCHEMA);
  const levels: AiLevel[] = ['zagrozenie', 'powazne', 'niepokojace', 'brak'];
  if (!r.level || !levels.includes(r.level) || typeof r.title !== 'string') throw new AiError('Niepoprawna odpowiedź modelu.', 'server');
  return { model, level: r.level, title: r.title, message: r.message ?? '', markers: (r.markers ?? []).slice(0, 5), explanation: r.explanation ?? '' };
}
