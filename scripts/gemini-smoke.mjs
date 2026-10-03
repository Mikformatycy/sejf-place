// Checks the Gemini key and model from .env.local with one tiny JSON call. Never prints the key.
// Usage: npm run gemini:smoke [-- other-model ...]
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/)
    .filter((l) => /^\s*[A-Z_]+\s*=/.test(l))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
);
const key = env.EXPO_PUBLIC_GEMINI_API_KEY;
// Extra models to compare can be passed as arguments: npm run gemini:smoke -- gemini-3.7-flash
const models = [...new Set([env.EXPO_PUBLIC_GEMINI_MODEL || 'gemini-3.5-flash', ...process.argv.slice(2)])];
if (!key) {
  console.log('Brak EXPO_PUBLIC_GEMINI_API_KEY w .env.local');
  process.exit(1);
}

let ok = false;
for (const model of models) {
  const t = Date.now();
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: 'Odpowiedz JSON-em: {"ok": true}' }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseJsonSchema: { type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'] },
      },
    }),
  });
  const body = await res.json().catch(() => ({}));
  const text = body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
  const detail = res.ok ? `${body.modelVersion ?? model}, odpowiedź ${text}` : (body.error?.message ?? '').slice(0, 160);
  console.log(`${res.ok ? 'OK ' : 'ERR'} ${model} (${res.status}, ${Date.now() - t} ms) ${detail}`);
  ok ||= res.ok && models.indexOf(model) === 0;
}
process.exitCode = ok ? 0 : 1;
