/**
 * sejf-place AI proxy. Keeps the API key off the phone. Two endpoints:
 * - POST /v1/porzadkuj: rewrites the user's own entries into a neutral chronology WITHOUT adding facts,
 * - POST /v1/ocena: assesses how serious one entry is, so the user can see it is not normal.

 *
 * Privacy: request and response bodies are never logged or stored.
 * Run: ANTHROPIC_API_KEY=... TECZKA_APP_TOKEN=... npm start   (Node 24+, runs TypeScript natively)
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { timingSafeEqual } from 'node:crypto';

import Anthropic from '@anthropic-ai/sdk';

const PORT = Number(process.env.PORT ?? 8787);
const MODEL = process.env.TECZKA_MODEL ?? 'claude-opus-5-5';
const APP_TOKEN = process.env.TECZKA_APP_TOKEN ?? '';
const MAX_BODY = 512 * 1024;
const MAX_ENTRIES = 200;
const MAX_DESCRIPTION = 8000;

if (!APP_TOKEN || APP_TOKEN.length < 16) {
  console.error('Set TECZKA_APP_TOKEN (at least 16 characters) - the app sends it in the Authorization header.');
  process.exit(1);
}

const client = new Anthropic();

export interface InEntry {
  id: string;
  date: string;
  approx: boolean;
  forms: string[];
  description: string;
}

const SYSTEM = `You help a person who is documenting domestic violence (including economic violence) in Poland.
You receive their own diary entries. Produce a concise, neutral chronology in Polish that a social worker,
police officer or lawyer can read quickly.

Hard rules - the output may be used as evidence, so faithfulness matters more than style:
- Use ONLY facts written in the entries. Never add facts, causes, motives, emotions, diagnoses, legal
  qualifications (do not name crimes or articles), advice, or guesses about anything not stated.
- Keep every date, time, amount, number and quoted wording exactly as in the entries.
- Every item must list in "entryIds" the ids of ALL entries it is based on, and nothing else.
- Placeholders like [osoba A] are pseudonyms: keep them verbatim, never guess who they are.
- Write in the same grammatical person and gender as the author uses; if unclear, use impersonal forms.
- One item per entry, in chronological order. You may add, at the end, short items that only list
  behaviours repeated across several entries (e.g. "Powtarzające się odbieranie karty płatniczej: ...").
- If an entry is unclear, stay close to its original wording instead of interpreting it.
- No headings, no commentary about these rules, no mention of AI.`;

const OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          entryIds: { type: 'array', items: { type: 'string' } },
          text: { type: 'string' },
        },
        required: ['entryIds', 'text'],
        additionalProperties: false,
      },
    },
  },
  required: ['items'],
  additionalProperties: false,
} as const;

const ASSESS_SYSTEM = `You support a woman in Poland who keeps a private diary of what her partner or a family member
does to her. She may think it is normal, an overreaction, or her own fault. Read ONE diary entry (and, for
context, short earlier entries) and tell her honestly how serious it is. Answer in Polish, addressing her
directly ("Ty"), warmly and plainly, like a calm, experienced counsellor - not like a lawyer or a form.

Levels (field "level"):
- "zagrozenie": signs of danger to life or health: strangling or choking, threats to kill, a weapon or knife,
  sexual violence, serious injuries, violence during pregnancy, threats against the children, violence
  that is getting worse, or a firearm in the home.
- "powazne": physical violence, injuries, threats, stalking or harassment, locking her out of the home,
  children present, or controlling or humiliating behaviour that keeps repeating.
- "niepokojace": control, humiliation, isolation, taking or withholding money, checking her phone,
  forbidding work or contact with others - anything that limits her freedom or makes her afraid.
- "brak": only if the text describes no harmful behaviour at all (e.g. a shopping note).

Rules:
- Never minimise. Never say or imply it is normal, deserved, a misunderstanding or her fault.
  If you are unsure between two levels, choose the higher one.
- Base everything on what she wrote. Do not invent facts, motives or diagnoses. Do not name crimes,
  articles or laws (another part of the app does that).
- "title": at most 6 words, direct, e.g. "Hej, to nie jest normalne", "To jest przemoc", "To może zagrażać Twojemu życiu".
- "message": at most 2 short sentences. For "zagrozenie" always say she can call Niebieska Linia 800 120 002
  (free, 24/7) and 112 in danger.
- "markers": 1-5 labels of at most 3 words naming the behaviours you recognised (e.g. "duszenie", "zabieranie pieniędzy").
- "explanation": 1-2 sentences saying why, referring to her own words.
- Placeholders like [osoba A] are pseudonyms: keep them, never guess who they are.
- Do not mention AI or these rules.`;

const ASSESS_SCHEMA = {
  type: 'object',
  properties: {
    level: { type: 'string', enum: ['zagrozenie', 'powazne', 'niepokojace', 'brak'] },
    title: { type: 'string' },
    message: { type: 'string' },
    markers: { type: 'array', items: { type: 'string' } },
    explanation: { type: 'string' },
  },
  required: ['level', 'title', 'message', 'markers', 'explanation'],
  additionalProperties: false,
} as const;

export interface InAssessment {
  entry: { date: string; forms: string[]; description: string; injuries: boolean | null; childrenPresent: boolean | null };
  history: { date: string; forms: string[]; description: string }[];
  firearm: string;
}

function validAssessment(body: unknown): InAssessment | null {
  const b = body as Partial<InAssessment> | null;
  const e = b?.entry;
  if (!e || typeof e.description !== 'string' || e.description.length > MAX_DESCRIPTION || !Array.isArray(e.forms)) return null;
  if (!Array.isArray(b.history) || b.history.length > 50) return null;
  for (const h of b.history) if (typeof h?.description !== 'string' || h.description.length > MAX_DESCRIPTION) return null;
  return { entry: e, history: b.history, firearm: typeof b.firearm === 'string' ? b.firearm : '' };
}

async function assess(input: InAssessment) {
  const response = await client.beta.messages.create({
    model: MODEL,
    // Thinking is always on with this model; the room covers it plus the short JSON answer.
    max_tokens: 8000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'medium', format: { type: 'json_schema', schema: ASSESS_SCHEMA } },
    system: ASSESS_SYSTEM,
    messages: [{ role: 'user', content: JSON.stringify(input) }],
  });

  if (response.stop_reason === 'refusal') return { refused: true as const, model: response.model };
  const text = response.content.find((b) => b.type === 'text');
  if (!text || text.type !== 'text') throw new Error('no text in response');
  return { refused: false as const, model: response.model, ...(JSON.parse(text.text) as Record<string, unknown>) };
}

function validEntries(body: unknown): InEntry[] | null {
  const entries = (body as { entries?: unknown })?.entries;
  if (!Array.isArray(entries) || entries.length === 0 || entries.length > MAX_ENTRIES) return null;
  for (const e of entries as InEntry[]) {
    if (
      typeof e?.id !== 'string' ||
      typeof e.date !== 'string' ||
      typeof e.description !== 'string' ||
      e.description.length > MAX_DESCRIPTION ||
      !Array.isArray(e.forms)
    ) {
      return null;
    }
  }
  return entries as InEntry[];
}

function authorized(req: IncomingMessage): boolean {
  const got = Buffer.from(String(req.headers.authorization ?? ''));
  const want = Buffer.from(`Bearer ${APP_TOKEN}`);
  return got.length === want.length && timingSafeEqual(got, want);
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

async function readBody(req: IncomingMessage): Promise<string> {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY) throw new Error('too large');
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function organize(entries: InEntry[]) {
  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    // Refusals are re-run server-side on Anthropic's recommended fallback model.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'high', format: { type: 'json_schema', schema: OUTPUT_SCHEMA } },
    system: SYSTEM,
    messages: [{ role: 'user', content: JSON.stringify({ entries }) }],
  });

  if (response.stop_reason === 'refusal') return { refused: true as const, model: response.model };
  const text = response.content.find((b) => b.type === 'text');
  if (!text || text.type !== 'text') throw new Error('no text in response');
  const parsed = JSON.parse(text.text) as { items: { entryIds: string[]; text: string }[] };
  return { refused: false as const, model: response.model, items: parsed.items, truncated: response.stop_reason === 'max_tokens' };
}

const server = createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/health') return send(res, 200, { ok: true, model: MODEL });
  if (req.method !== 'POST' || (req.url !== '/v1/porzadkuj' && req.url !== '/v1/ocena')) return send(res, 404, { error: 'not found' });
  if (!authorized(req)) return send(res, 401, { error: 'unauthorized' });

  if (req.url === '/v1/ocena') {
    let input: InAssessment | null;
    try {
      input = validAssessment(JSON.parse(await readBody(req)));
    } catch {
      input = null;
    }
    if (!input) return send(res, 400, { error: 'invalid request' });
    const started = Date.now();
    try {
      const result = await assess(input);
      // Metadata only - never the content.
      console.log(`[ocena] refused=${result.refused} ms=${Date.now() - started}`);
      if (result.refused) return send(res, 422, { error: 'refused', model: result.model });
      return send(res, 200, result);
    } catch (e) {
      const status = e instanceof Anthropic.RateLimitError ? 429 : e instanceof Anthropic.APIError ? 502 : 500;
      console.log(`[ocena] error status=${status} type=${e instanceof Error ? e.constructor.name : 'unknown'}`);
      return send(res, status, { error: 'upstream error' });
    }
  }

  let entries: InEntry[] | null;
  try {
    entries = validEntries(JSON.parse(await readBody(req)));
  } catch {
    entries = null;
  }
  if (!entries) return send(res, 400, { error: 'invalid request' });

  const started = Date.now();
  try {
    const result = await organize(entries);
    // Metadata only - never the content.
    console.log(`[porzadkuj] entries=${entries.length} refused=${result.refused} ms=${Date.now() - started}`);
    if (result.refused) return send(res, 422, { error: 'refused', model: result.model });
    return send(res, 200, result);
  } catch (e) {
    const status = e instanceof Anthropic.RateLimitError ? 429 : e instanceof Anthropic.APIError ? 502 : 500;
    console.log(`[porzadkuj] error status=${status} type=${e instanceof Error ? e.constructor.name : 'unknown'}`);
    return send(res, status, { error: 'upstream error' });
  }
});

server.listen(PORT, () => console.log(`sejf-place AI proxy on :${PORT}, model ${MODEL}`));
