import { fetch } from 'expo/fetch';

import { AiError } from './errors';
import { GEMINI_FALLBACK_MODEL, GEMINI_KEY, GEMINI_MODEL } from './config';

// Descriptions of violence are exactly what this app is for; only clearly harmful output is blocked.
const SAFETY = ['HARM_CATEGORY_HARASSMENT', 'HARM_CATEGORY_HATE_SPEECH', 'HARM_CATEGORY_SEXUALLY_EXPLICIT', 'HARM_CATEGORY_DANGEROUS_CONTENT'].map(
  (category) => ({ category, threshold: 'BLOCK_ONLY_HIGH' }),
);

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
  modelVersion?: string;
}

/** One structured-JSON call to models.generateContent. */
export async function geminiJson<T>(system: string, user: string, schema: object, timeoutMs = 90_000): Promise<{ data: T; model: string; truncated: boolean }> {
  if (!GEMINI_KEY) throw new AiError('Brak klucza Gemini (EXPO_PUBLIC_GEMINI_API_KEY w .env.local).', 'config');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts: [{ text: user }] }],
    generationConfig: { responseMimeType: 'application/json', responseJsonSchema: schema },
    safetySettings: SAFETY,
  });
  const call = async (model: string) =>
    (await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_KEY },
      body,
      signal: controller.signal,
    })) as unknown as Response;
  let res: Response;
  let model = GEMINI_MODEL;
  try {
    res = await call(model);
    // The free tier's newest model is often overloaded; one try on another model beats an error.
    if ((res.status >= 500 || res.status === 429) && GEMINI_FALLBACK_MODEL !== model) {
      model = GEMINI_FALLBACK_MODEL;
      res = await call(model);
    }
  } catch {
    throw new AiError('Brak połączenia z internetem albo z Gemini.', 'network');
  } finally {
    clearTimeout(timer);
  }
  if (res.status === 400 || res.status === 403) throw new AiError('Gemini odrzucił klucz albo zapytanie.', 'auth');
  if (res.status >= 500) throw new AiError('Gemini jest teraz przeciążony. Spróbuj za chwilę.', 'server');
  if (res.status === 429) throw new AiError('Wyczerpany darmowy limit Gemini. Spróbuj później.', 'server');
  if (!res.ok) throw new AiError(`Błąd Gemini (${res.status}).`, 'server');

  const out = (await res.json()) as GeminiResponse;
  const candidate = out.candidates?.[0];
  if (out.promptFeedback?.blockReason || candidate?.finishReason === 'SAFETY') {
    throw new AiError('Model odmówił przetworzenia tego wpisu.', 'refused');
  }
  const text = candidate?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
  try {
    return { data: JSON.parse(text) as T, model: out.modelVersion ?? model, truncated: candidate?.finishReason === 'MAX_TOKENS' };
  } catch {
    throw new AiError('Niepoprawna odpowiedź modelu.', 'server');
  }
}
