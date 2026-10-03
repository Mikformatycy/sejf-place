import { toHex, utf8 } from '@/crypto/bytes';
import { cryptoProvider } from '@/crypto/provider';
import type { Entry, EntryContent } from '@/vault/types';

import { canonicalJson } from './canonicalJson';

export const GENESIS_HASH = '0'.repeat(64);
export const RECORD_VERSION = 1;

/** The exact structure that is hashed. Changing it breaks verification of old entries. */
export function entryRecord(e: Pick<Entry, 'id' | 'seq' | 'createdAt' | 'prevHash'>, content: EntryContent) {
  return { v: RECORD_VERSION, id: e.id, seq: e.seq, createdAt: e.createdAt, prevHash: e.prevHash, content };
}

export async function hashRecord(record: unknown): Promise<string> {
  return toHex(await cryptoProvider().sha256(utf8(canonicalJson(record))));
}

/** Appends a new entry to the chain (entries are never edited in place). */
export async function appendEntry(entries: Entry[], content: EntryContent, now: Date = new Date()): Promise<Entry> {
  const last = entries[entries.length - 1];
  const base = {
    id: toHex(cryptoProvider().randomBytes(8)),
    seq: (last?.seq ?? 0) + 1,
    createdAt: now.toISOString(),
    prevHash: last?.hash ?? GENESIS_HASH,
  };
  const hash = await hashRecord(entryRecord(base, content));
  return { ...base, hash, content };
}

/** Removes the content but keeps id/seq/hash so the chain still links. */
export function tombstone(entry: Entry, now: Date = new Date()): Entry {
  return { ...entry, content: null, deletedAt: now.toISOString() };
}

export type LinkStatus = 'ok' | 'deleted' | 'hash-mismatch' | 'broken-link' | 'bad-seq';

export interface ChainCheck {
  id: string;
  seq: number;
  status: LinkStatus;
}

/** Recomputes every hash and link. Deleted entries can only be checked for linkage. */
export async function verifyChain(entries: Entry[]): Promise<ChainCheck[]> {
  const out: ChainCheck[] = [];
  let prev = GENESIS_HASH;
  let prevSeq = 0;
  for (const e of entries) {
    let status: LinkStatus = 'ok';
    if (e.prevHash !== prev) status = 'broken-link';
    else if (e.seq !== prevSeq + 1) status = 'bad-seq';
    else if (!e.content) status = 'deleted';
    else if ((await hashRecord(entryRecord(e, e.content))) !== e.hash) status = 'hash-mismatch';
    out.push({ id: e.id, seq: e.seq, status });
    prev = e.hash;
    prevSeq = e.seq;
  }
  return out;
}
