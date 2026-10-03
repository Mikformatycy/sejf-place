/**
 * Crypto primitives used by the vault. The app uses the native expo-crypto
 * implementation; unit tests plug in Node's WebCrypto through the same interface.
 */
export interface CryptoProvider {
  randomBytes(length: number): Uint8Array;
  sha256(data: Uint8Array): Promise<Uint8Array>;
  /** AES-256-GCM. Returns iv(12) || ciphertext || tag(16). */
  aesGcmEncrypt(key: Uint8Array, plaintext: Uint8Array, aad?: Uint8Array): Promise<Uint8Array>;
  /** Throws when the key is wrong or the data was modified. */
  aesGcmDecrypt(key: Uint8Array, sealed: Uint8Array, aad?: Uint8Array): Promise<Uint8Array>;
}

let current: CryptoProvider | null = null;

export function setCryptoProvider(provider: CryptoProvider): void {
  current = provider;
}

export function cryptoProvider(): CryptoProvider {
  if (!current) throw new Error('CryptoProvider not configured');
  return current;
}
