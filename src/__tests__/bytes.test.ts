import { fromBase64, fromUtf8, toBase64, utf8 } from '@/crypto/bytes';

// The previous (slow) implementations. Keys and entry hashes depend on these exact bytes,
// so the fast versions must produce identical output.
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function oldUtf8(text: string): Uint8Array {
  const out: number[] = [];
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    if (cp < 0x80) out.push(cp);
    else if (cp < 0x800) out.push(0xc0 | (cp >> 6), 0x80 | (cp & 63));
    else if (cp < 0x10000) out.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63));
    else out.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 63), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63));
  }
  return new Uint8Array(out);
}

function oldToBase64(bytes: Uint8Array): string {
  let out = '';
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + B64[(n >> 6) & 63] + B64[n & 63];
  }
  if (i < bytes.length) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8);
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63];
    out += i + 1 < bytes.length ? B64[(n >> 6) & 63] + '=' : '==';
  }
  return out;
}

function randomBytes(n: number, seed: number): Uint8Array {
  const out = new Uint8Array(n);
  let x = seed;
  for (let i = 0; i < n; i++) {
    x = (x * 1103515245 + 12345) & 0x7fffffff;
    out[i] = x >> 16;
  }
  return out;
}

const SAMPLES = [
  '',
  'a',
  'przepisy|editIngredient|sernik/0|1250',
  'Zażółć gęślą jaźń. ŁÓDŹ, źdźbło',
  'emoji 👩‍👧 💧 ☕ and CJK 漢字',
  'lone \ud83d surrogate and \udc4d low',
  'x'.repeat(10_000) + 'ą'.repeat(5_000),
];

describe('utf8', () => {
  it.each(SAMPLES.map((s) => [s.slice(0, 20), s]))('matches the previous encoder: %s', (_label, s) => {
    expect(utf8(s)).toEqual(oldUtf8(s));
  });

  it('round-trips valid text', () => {
    for (const s of SAMPLES.filter((x) => !x.includes('lone'))) expect(fromUtf8(utf8(s))).toBe(s);
  });
});

describe('base64', () => {
  it('matches the previous encoder for every length remainder', () => {
    for (const n of [0, 1, 2, 3, 4, 5, 31, 32, 33, 4095, 4096, 4097, 100_000]) {
      const bytes = randomBytes(n, n + 7);
      expect(toBase64(bytes)).toBe(oldToBase64(bytes));
    }
  });

  it('round-trips and ignores whitespace and padding', () => {
    for (const n of [0, 1, 2, 3, 1000, 12_345]) {
      const bytes = randomBytes(n, n);
      const b64 = toBase64(bytes);
      expect(fromBase64(b64)).toEqual(bytes);
      expect(fromBase64(b64.replace(/(.{64})/g, '$1\n'))).toEqual(bytes);
    }
  });
});
