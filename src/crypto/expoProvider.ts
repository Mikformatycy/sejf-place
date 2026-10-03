import {
  AESEncryptionKey,
  AESSealedData,
  CryptoDigestAlgorithm,
  aesDecryptAsync,
  aesEncryptAsync,
  digest,
  getRandomBytes,
} from 'expo-crypto';

import type { CryptoProvider } from './provider';

const IV_LENGTH = 12;
const TAG_LENGTH = 16;

export const expoCryptoProvider: CryptoProvider = {
  randomBytes(length) {
    // getRandomBytes accepts at most 1024 bytes per call.
    const out = new Uint8Array(length);
    for (let offset = 0; offset < length; offset += 1024) {
      out.set(getRandomBytes(Math.min(1024, length - offset)), offset);
    }
    return out;
  },

  async sha256(data) {
    return new Uint8Array(await digest(CryptoDigestAlgorithm.SHA256, data as Uint8Array<ArrayBuffer>));
  },

  async aesGcmEncrypt(key, plaintext, aad) {
    const aesKey = await AESEncryptionKey.import(key);
    const sealed = await aesEncryptAsync(plaintext, aesKey, {
      nonce: { length: IV_LENGTH },
      tagLength: TAG_LENGTH,
      additionalData: aad,
    });
    return sealed.combined();
  },

  async aesGcmDecrypt(key, sealed, aad) {
    const aesKey = await AESEncryptionKey.import(key);
    const data = AESSealedData.fromCombined(sealed, { ivLength: IV_LENGTH, tagLength: TAG_LENGTH });
    return aesDecryptAsync(data, aesKey, { output: 'bytes', additionalData: aad });
  },
};
