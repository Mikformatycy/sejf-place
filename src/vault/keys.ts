import { hkdf } from '@noble/hashes/hkdf.js';
import { hmac } from '@noble/hashes/hmac.js';
import { scryptAsync } from '@noble/hashes/scrypt.js';
import { sha256 } from '@noble/hashes/sha2.js';

import { concatBytes, fromBase64, toBase64, toHex, utf8, wipe } from '@/crypto/bytes';
import { cryptoProvider } from '@/crypto/provider';

/** Small key/value store for secrets (Keychain/Keystore in the app, memory in tests). */
export interface SecretStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  del(key: string): Promise<void>;
}

export interface KdfParams {
  N: number;
  r: number;
  p: number;
}

// Pure-JS scrypt on Hermes (no JIT) is slow: N=2^14 measured 14.8-15.9 s on the emulator (release).
// The KEK also mixes in the Keystore-bound device key, so an attacker without Keystore access
// cannot brute-force offline at all; N only matters after a Keystore compromise (model zagrożeń #9).
export const DEFAULT_KDF: KdfParams = { N: 2 ** 11, r: 8, p: 1 };

// One record in the keystore, written in a single call, so key material can never be
// half-updated (an earlier multi-item layout could desynchronise under concurrent writes).
// The name is neutral: nothing in the keystore hints at what the app is.
const RECORD_KEY = 'pb.k';

interface KeyRecord {
  v: 1;
  dk: string;
  wmk: string;
  salt: string;
  kdf: KdfParams;
  tag: string;
}

const MASTER_AAD = utf8('przybornik/mk/v1');
const HKDF_INFO = utf8('przybornik/kek/v1');
const PREFILTER_PREFIX = 'przybornik/prefilter/v1|';

/**
 * Holds the device key and the wrapped master key.
 *
 * The secret is the canonical form of the user's chosen cover action
 * (e.g. "przepisy|editIngredient|sernik/0|1234"). Every action in the cover
 * goes through `prefilter` (HMAC, microseconds); only a 16-bit match runs the
 * expensive scrypt + AES-GCM unwrap, so the cover never feels slow.
 */
export class KeyManager {
  private record: KeyRecord | null = null;
  private deviceKey: Uint8Array | null = null;
  // Serialises every write; a second initialise/setSecret waits for the first.
  private queue: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly store: SecretStore,
    private readonly newKdf: KdfParams = DEFAULT_KDF,
  ) {}

  private exclusive<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.queue.then(fn, fn);
    this.queue = run.catch(() => undefined);
    return run;
  }

  /** Loads key material from the store. Returns whether the vault exists. */
  async load(): Promise<boolean> {
    const raw = await this.store.get(RECORD_KEY);
    if (!raw) return false;
    try {
      this.record = JSON.parse(raw) as KeyRecord;
      this.deviceKey = fromBase64(this.record.dk);
      return true;
    } catch {
      return false;
    }
  }

  isInitialized(): boolean {
    return this.record !== null;
  }

  /** Cheap check run on every candidate action in the cover. */
  prefilter(canonical: string): boolean {
    if (!this.deviceKey || !this.record) return false;
    return computeTag(this.deviceKey, canonical) === this.record.tag;
  }

  /** Returns the master key when `canonical` is the user's secret, otherwise null. */
  async tryUnlock(canonical: string): Promise<Uint8Array | null> {
    const rec = this.record;
    const dk = this.deviceKey;
    if (!rec || !dk || !this.prefilter(canonical)) return null;
    const kek = await deriveKek(canonical, fromBase64(rec.salt), dk, rec.kdf);
    try {
      return await cryptoProvider().aesGcmDecrypt(kek, fromBase64(rec.wmk), MASTER_AAD);
    } catch (e) {
      // Expected on a 16-bit prefilter collision; anything else is worth seeing in logcat.
      console.log(`[unlock] unwrap failed: ${e instanceof Error ? e.message : String(e)}`);
      return null;
    } finally {
      wipe(kek);
    }
  }

  /** True when the vault was wrapped with older (slower) KDF parameters. */
  needsKdfUpgrade(): boolean {
    return !!this.record && JSON.stringify(this.record.kdf) !== JSON.stringify(this.newKdf);
  }

  /** Creates a new vault protected by `canonical`. Returns the new master key. */
  initialize(canonical: string): Promise<Uint8Array> {
    return this.exclusive(async () => {
      const provider = cryptoProvider();
      const dk = provider.randomBytes(32);
      const masterKey = provider.randomBytes(32);
      await this.writeRecord(dk, masterKey, canonical);
      return masterKey;
    });
  }

  /** Re-wraps the master key under a new secret. The old secret stops working immediately. */
  setSecret(masterKey: Uint8Array, canonical: string): Promise<void> {
    return this.exclusive(async () => {
      if (!this.deviceKey) throw new Error('Vault not initialized');
      await this.writeRecord(this.deviceKey, masterKey, canonical);
    });
  }

  /** Everything is computed locally first, then persisted in one call, then published. */
  private async writeRecord(dk: Uint8Array, masterKey: Uint8Array, canonical: string): Promise<void> {
    const salt = cryptoProvider().randomBytes(16);
    const kek = await deriveKek(canonical, salt, dk, this.newKdf);
    const wrapped = await cryptoProvider().aesGcmEncrypt(kek, masterKey, MASTER_AAD);
    wipe(kek);
    const record: KeyRecord = {
      v: 1,
      dk: toBase64(dk),
      wmk: toBase64(wrapped),
      salt: toBase64(salt),
      kdf: this.newKdf,
      tag: computeTag(dk, canonical),
    };
    await this.store.set(RECORD_KEY, JSON.stringify(record));
    this.record = record;
    this.deviceKey = dk;
  }

  /** Irreversibly forgets all keys. Encrypted files become unreadable. */
  destroy(): Promise<void> {
    return this.exclusive(async () => {
      await this.store.del(RECORD_KEY);
      wipe(this.deviceKey);
      this.deviceKey = null;
      this.record = null;
    });
  }
}

function computeTag(deviceKey: Uint8Array, canonical: string): string {
  const mac = hmac(sha256, deviceKey, utf8(PREFILTER_PREFIX + canonical));
  return toHex(mac.slice(0, 2));
}

async function deriveKek(canonical: string, salt: Uint8Array, deviceKey: Uint8Array, kdf: KdfParams) {
  const started = Date.now();
  // noble yields with setTimeout(0) every `asyncTick` ms. In React Native each yield costs about
  // a frame: with 10 ms, half of the unlock time was spent waiting (1.4 s vs 0.65 s for N=2^11,
  // release build on the emulator). Nothing is animating during an unlock, so 100 ms is fine.
  const stretched = await scryptAsync(utf8(canonical), salt, { ...kdf, dkLen: 32, asyncTick: 100 });
  // Timing only (no secrets), to tune N per device; visible via `adb logcat`.
  console.log(`[kdf] N=${kdf.N} ${Date.now() - started} ms`);
  const ikm = concatBytes(stretched, deviceKey);
  const kek = hkdf(sha256, ikm, salt, HKDF_INFO, 32);
  wipe(stretched);
  wipe(ikm);
  return kek;
}

export class MemorySecretStore implements SecretStore {
  readonly data = new Map<string, string>();
  async get(key: string) {
    return this.data.get(key) ?? null;
  }
  async set(key: string, value: string) {
    this.data.set(key, value);
  }
  async del(key: string) {
    this.data.delete(key);
  }
}
