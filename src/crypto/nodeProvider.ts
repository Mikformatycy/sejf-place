// Test-only provider backed by Node's WebCrypto. Never imported by the app bundle.
import { webcrypto } from 'node:crypto';

import type { CryptoProvider } from './provider';

const subtle = webcrypto.subtle;

// WebCrypto typings want ArrayBuffer-backed views; ours always are.
const buf = (b: Uint8Array) => b as Uint8Array<ArrayBuffer>;

async function importKey(key: Uint8Array) {
  return subtle.importKey('raw', buf(key), 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export const nodeCryptoProvider: CryptoProvider = {
  randomBytes(length) {
    return webcrypto.getRandomValues(new Uint8Array(length));
  },
  async sha256(data) {
    return new Uint8Array(await subtle.digest('SHA-256', buf(data)));
  },
  async aesGcmEncrypt(key, plaintext, aad) {
    const iv = webcrypto.getRandomValues(new Uint8Array(12));
    const params = aad ? { name: 'AES-GCM', iv, additionalData: buf(aad) } : { name: 'AES-GCM', iv };
    const ct = new Uint8Array(await subtle.encrypt(params, await importKey(key), buf(plaintext)));
    const out = new Uint8Array(iv.length + ct.length);
    out.set(iv);
    out.set(ct, iv.length);
    return out;
  },
  async aesGcmDecrypt(key, sealed, aad) {
    const iv = sealed.slice(0, 12);
    const params = aad ? { name: 'AES-GCM', iv: buf(iv), additionalData: buf(aad) } : { name: 'AES-GCM', iv: buf(iv) };
    return new Uint8Array(await subtle.decrypt(params, await importKey(key), buf(sealed.slice(12))));
  },
};
