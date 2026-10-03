import { AiError } from './errors';
import { geminiJson } from './gemini';
import { ASSESS_SCHEMA, ASSESS_SYSTEM, REWRITE_SCHEMA, REWRITE_SYSTEM } from './prompts';

export { AiError } from './errors';

/** The description with spelling and sentences corrected (names must be pseudonymised first). */
export async function requestRewrite(description: string): Promise<{ model: string; text: string }> {
  const r = await geminiJson<{ text?: string }>(REWRITE_SYSTEM, description, REWRITE_SCHEMA);
  const text = (r.data.text ?? '').trim();
  if (!text) throw new AiError('Niepoprawna odpowiedź modelu.', 'server');
  return { model: r.model, text };
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
