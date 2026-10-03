import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';

import { appendEntry, tombstone } from '@/integrity/chain';
import { expoPostBinary } from '@/integrity/expoHttp';
import { stampPending } from '@/integrity/tsaQueue';

import { useDraft } from './evidence';
import { keyManager, useSession, vaultStore } from './session';
import type { Entry, EntryContent } from './types';

/** A TSA normally answers within a second or two; do not keep the user waiting longer. */
export const TSA_TIMEOUT_MS = 10_000;

export async function saveEntry(content: EntryContent): Promise<Entry> {
  let created: Entry | null = null;
  await useSession.getState().update(async (index) => {
    created = await appendEntry(index.entries, content);
    index.entries.push(created);
  });
  void stampNow();
  return created!;
}

/** False only when the phone reports no connection at all (then there is no point waiting). */
export async function isOnline(): Promise<boolean> {
  try {
    const state = await Network.getNetworkStateAsync();
    return state.isConnected !== false && state.isInternetReachable !== false;
  } catch {
    return true;
  }
}

export interface StampResult {
  stamped: number;
  failed: number;
  offline: boolean;
}

let inFlight: Promise<StampResult> | null = null;

/**
 * Requests RFC 3161 timestamps for every entry that has none yet. Only runs while unlocked.
 * A second call while one is running waits for it instead of reporting "nothing done".
 */
export function stampNow(): Promise<StampResult> {
  inFlight ??= runStamping().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function runStamping(): Promise<StampResult> {
  const { index, unlocked } = useSession.getState();
  const pending = index?.entries.filter((e) => !e.tsa).length ?? 0;
  if (!index || !unlocked || pending === 0) return { stamped: 0, failed: 0, offline: false };
  if (!(await isOnline())) return { stamped: 0, failed: pending, offline: true };

  const working: Entry[] = JSON.parse(JSON.stringify(index.entries));
  const result = await stampPending(working, index.settings.tsaUrls, expoPostBinary, TSA_TIMEOUT_MS);
  if (result.stamped > 0 && useSession.getState().unlocked) {
    const byId = new Map(working.filter((e) => e.tsa).map((e) => [e.id, e.tsa]));
    await useSession.getState().update((idx) => {
      for (const e of idx.entries) if (!e.tsa && byId.has(e.id)) e.tsa = byId.get(e.id);
    });
  }
  return { ...result, offline: false };
}

/** Deletes the content and files of an entry; its hash stays so the chain remains verifiable. */
export async function deleteEntryContent(id: string): Promise<void> {
  const entry = useSession.getState().index?.entries.find((e) => e.id === id);
  // Update the index first: if that fails, the files are still there and nothing is lost.
  await useSession.getState().update((index) => {
    index.entries = index.entries.map((e) => (e.id === id ? tombstone(e) : e));
  });
  for (const a of entry?.content?.attachments ?? []) await vaultStore.removeBlob(a.id).catch(() => undefined);
}

/** Irreversible: forgets the keys and removes every encrypted file. */
export async function wipeEverything(): Promise<void> {
  // Empty the draft first, so locking does not write it back while the files are deleted.
  useDraft.getState().reset();
  useSession.getState().lock();
  await vaultStore.wipeAll();
  await keyManager.destroy();
  const keys = await AsyncStorage.getAllKeys();
  await AsyncStorage.multiRemove(keys.filter((k) => k.startsWith('pb.')));
  useSession.setState({ initialized: false, coverId: 'przepisy' });
}
