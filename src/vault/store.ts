import { fromUtf8, toHex, utf8 } from '@/crypto/bytes';
import { cryptoProvider } from '@/crypto/provider';

import { emptyIndex, type VaultIndex } from './types';

/** Flat file storage for encrypted blobs (expo-file-system in the app, memory in tests). */
export interface BlobFS {
  read(name: string): Promise<Uint8Array | null>;
  write(name: string, data: Uint8Array): Promise<void>;
  remove(name: string): Promise<void>;
  list(): Promise<string[]>;
}

const INDEX_FILE = 'index.enc';
const INDEX_AAD = utf8('przybornik/index/v1');
const DRAFT_FILE = 'draft.enc';
const DRAFT_AAD = utf8('przybornik/draft/v1');

const blobName = (id: string) => `b_${id}.enc`;
const blobAad = (id: string) => utf8(`przybornik/blob/v1|${id}`);

/** Everything on disk is AES-256-GCM encrypted with the master key. */
export class VaultStore {
  constructor(private readonly fs: BlobFS) {}

  async loadIndex(masterKey: Uint8Array): Promise<VaultIndex> {
    const sealed = await this.fs.read(INDEX_FILE);
    if (!sealed) return emptyIndex(new Date().toISOString());
    const plain = await cryptoProvider().aesGcmDecrypt(masterKey, sealed, INDEX_AAD);
    return JSON.parse(fromUtf8(plain)) as VaultIndex;
  }

  async saveIndex(masterKey: Uint8Array, index: VaultIndex): Promise<void> {
    const sealed = await cryptoProvider().aesGcmEncrypt(masterKey, utf8(JSON.stringify(index)), INDEX_AAD);
    await this.fs.write(INDEX_FILE, sealed);
  }

  /** The unsaved entry, so it survives a quick exit. Null when there is none (or it is unreadable). */
  async loadDraft<T>(masterKey: Uint8Array): Promise<T | null> {
    const sealed = await this.fs.read(DRAFT_FILE);
    if (!sealed) return null;
    try {
      return JSON.parse(fromUtf8(await cryptoProvider().aesGcmDecrypt(masterKey, sealed, DRAFT_AAD))) as T;
    } catch {
      // E.g. left behind by a vault that was wiped while the draft was being written.
      await this.fs.remove(DRAFT_FILE);
      return null;
    }
  }

  async saveDraft(masterKey: Uint8Array, draft: unknown): Promise<void> {
    const sealed = await cryptoProvider().aesGcmEncrypt(masterKey, utf8(JSON.stringify(draft)), DRAFT_AAD);
    await this.fs.write(DRAFT_FILE, sealed);
  }

  async clearDraft(): Promise<void> {
    await this.fs.remove(DRAFT_FILE);
  }

  /** Encrypts and stores a file. Returns its id and the SHA-256 of the original bytes. */
  async putBlob(masterKey: Uint8Array, data: Uint8Array): Promise<{ id: string; sha256: string }> {
    const provider = cryptoProvider();
    const id = toHex(provider.randomBytes(16));
    const sha256 = toHex(await provider.sha256(data));
    await this.fs.write(blobName(id), await provider.aesGcmEncrypt(masterKey, data, blobAad(id)));
    return { id, sha256 };
  }

  async getBlob(masterKey: Uint8Array, id: string): Promise<Uint8Array> {
    const sealed = await this.fs.read(blobName(id));
    if (!sealed) throw new Error(`Missing blob ${id}`);
    return cryptoProvider().aesGcmDecrypt(masterKey, sealed, blobAad(id));
  }

  async removeBlob(id: string): Promise<void> {
    await this.fs.remove(blobName(id));
  }

  /** Removes blobs that no entry references (e.g. from an abandoned draft). */
  async collectGarbage(index: VaultIndex, keep: Set<string> = new Set()): Promise<number> {
    const used = new Set(keep);
    for (const e of index.entries) for (const a of e.content?.attachments ?? []) used.add(a.id);
    let removed = 0;
    for (const name of await this.fs.list()) {
      const m = /^b_([0-9a-f]+)\.enc$/.exec(name);
      if (m && !used.has(m[1])) {
        await this.fs.remove(name);
        removed++;
      }
    }
    return removed;
  }

  async wipeAll(): Promise<void> {
    for (const name of await this.fs.list()) await this.fs.remove(name);
  }
}

export class MemoryBlobFS implements BlobFS {
  readonly files = new Map<string, Uint8Array>();
  async read(name: string) {
    return this.files.get(name) ?? null;
  }
  async write(name: string, data: Uint8Array) {
    this.files.set(name, data);
  }
  async remove(name: string) {
    this.files.delete(name);
  }
  async list() {
    return [...this.files.keys()];
  }
}
