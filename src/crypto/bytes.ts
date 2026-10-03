const HEX = '0123456789abcdef';

export function toHex(bytes: Uint8Array): string {
  let out = '';
  for (const b of bytes) out += HEX[b >> 4] + HEX[b & 15];
  return out;
}

export function fromHex(hex: string): Uint8Array {
  if (hex.length % 2 !== 0 || /[^0-9a-f]/i.test(hex)) throw new Error('Invalid hex');
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const B64_ENC = new Uint8Array(64);
const B64_DEC = new Int8Array(128).fill(-1);
for (let i = 0; i < 64; i++) {
  B64_ENC[i] = B64.charCodeAt(i);
  B64_DEC[B64_ENC[i]] = i;
}
const PAD = 61; // '='

// These helpers run over the whole vault index (and over photos) on every save and unlock.
// Hermes has no JIT, so they work on typed arrays and build strings in chunks instead of
// concatenating one character at a time.
const CHUNK = 4096;

function codesToString(codes: Uint8Array | Uint16Array, length: number): string {
  let out = '';
  for (let i = 0; i < length; i += CHUNK) {
    out += String.fromCharCode.apply(null, codes.subarray(i, Math.min(i + CHUNK, length)) as unknown as number[]);
  }
  return out;
}

export function toBase64(bytes: Uint8Array): string {
  const len = bytes.length;
  const out = new Uint8Array(Math.ceil(len / 3) * 4);
  let o = 0;
  let i = 0;
  for (; i + 2 < len; i += 3) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out[o++] = B64_ENC[n >> 18];
    out[o++] = B64_ENC[(n >> 12) & 63];
    out[o++] = B64_ENC[(n >> 6) & 63];
    out[o++] = B64_ENC[n & 63];
  }
  if (i < len) {
    const n = (bytes[i] << 16) | (i + 1 < len ? bytes[i + 1] << 8 : 0);
    out[o++] = B64_ENC[n >> 18];
    out[o++] = B64_ENC[(n >> 12) & 63];
    out[o++] = i + 1 < len ? B64_ENC[(n >> 6) & 63] : PAD;
    out[o++] = PAD;
  }
  return codesToString(out, o);
}

/** Ignores everything outside the alphabet (padding, line breaks in PEM). */
export function fromBase64(b64: string): Uint8Array {
  const out = new Uint8Array(Math.ceil((b64.length * 3) / 4));
  let o = 0;
  let acc = 0;
  let bits = 0;
  for (let i = 0; i < b64.length; i++) {
    const c = b64.charCodeAt(i);
    const v = c < 128 ? B64_DEC[c] : -1;
    if (v < 0) continue;
    acc = ((acc << 6) | v) & 0xffffff;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[o++] = (acc >> bits) & 255;
    }
  }
  return out.slice(0, o);
}

// Manual UTF-8 so we do not depend on TextEncoder/TextDecoder support in the JS engine.
// A lone surrogate is encoded as its own 3-byte sequence, exactly as before, so keys and
// entry hashes computed by older versions stay the same.
export function utf8(text: string): Uint8Array {
  const out = new Uint8Array(text.length * 3);
  let o = 0;
  for (let i = 0; i < text.length; i++) {
    let cp = text.charCodeAt(i);
    if (cp >= 0xd800 && cp <= 0xdbff && i + 1 < text.length) {
      const lo = text.charCodeAt(i + 1);
      if (lo >= 0xdc00 && lo <= 0xdfff) {
        cp = 0x10000 + ((cp - 0xd800) << 10) + (lo - 0xdc00);
        i++;
      }
    }
    if (cp < 0x80) out[o++] = cp;
    else if (cp < 0x800) {
      out[o++] = 0xc0 | (cp >> 6);
      out[o++] = 0x80 | (cp & 63);
    } else if (cp < 0x10000) {
      out[o++] = 0xe0 | (cp >> 12);
      out[o++] = 0x80 | ((cp >> 6) & 63);
      out[o++] = 0x80 | (cp & 63);
    } else {
      out[o++] = 0xf0 | (cp >> 18);
      out[o++] = 0x80 | ((cp >> 12) & 63);
      out[o++] = 0x80 | ((cp >> 6) & 63);
      out[o++] = 0x80 | (cp & 63);
    }
  }
  return out.slice(0, o);
}

export function fromUtf8(bytes: Uint8Array): string {
  const units = new Uint16Array(bytes.length);
  let u = 0;
  for (let i = 0; i < bytes.length; ) {
    const b = bytes[i];
    let cp: number;
    if (b < 0x80) {
      cp = b;
      i += 1;
    } else if (b < 0xe0) {
      cp = ((b & 31) << 6) | (bytes[i + 1] & 63);
      i += 2;
    } else if (b < 0xf0) {
      cp = ((b & 15) << 12) | ((bytes[i + 1] & 63) << 6) | (bytes[i + 2] & 63);
      i += 3;
    } else {
      cp = ((b & 7) << 18) | ((bytes[i + 1] & 63) << 12) | ((bytes[i + 2] & 63) << 6) | (bytes[i + 3] & 63);
      i += 4;
    }
    if (cp >= 0x10000) {
      cp -= 0x10000;
      units[u++] = 0xd800 + (cp >> 10);
      units[u++] = 0xdc00 + (cp & 0x3ff);
    } else {
      units[u++] = cp;
    }
  }
  return codesToString(units, u);
}

export function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

export function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/** Best-effort wipe of key material held in JS memory. */
export function wipe(bytes: Uint8Array | null | undefined): void {
  bytes?.fill(0);
}
