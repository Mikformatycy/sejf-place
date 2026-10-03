import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { wipe } from '@/crypto/bytes';
import { expoCryptoProvider } from '@/crypto/expoProvider';
import { setCryptoProvider } from '@/crypto/provider';
import type { CoverId } from '@/covers/canonical';
import { COVERS } from '@/covers/catalog';

import { ExpoBlobFS, secureStore, wipeScratch } from './expoAdapters';
import { KeyManager } from './keys';
import { VaultStore } from './store';
import type { VaultIndex } from './types';

setCryptoProvider(expoCryptoProvider);

export const keyManager = new KeyManager(secureStore);
export const vaultStore = new VaultStore(new ExpoBlobFS());

const COVER_KEY = 'pb.cover';
const PENDING_COVER_KEY = 'pb.cover.next';

// The master key lives only in this module variable, never in React state or storage.
let masterKey: Uint8Array | null = null;

// Index writes run one at a time. Two overlapping updates (e.g. a new entry while timestamps
// arrive in the background) would each start from the same old index, and the later save
// would silently drop the other one's change.
let updateQueue: Promise<unknown> = Promise.resolve();

export function requireMasterKey(): Uint8Array {
  if (!masterKey) throw new Error('Vault is locked');
  return masterKey;
}

// Let other modules (the unsaved draft) save and restore their state around lock/unlock
// without an import cycle. A lock hook gets its own copy of the key, wiped when it finishes;
// an unlock hook returns the ids of vault files it still uses, so they are not collected.
type LockHook = (keyCopy: Uint8Array) => Promise<void>;
type UnlockHook = (index: VaultIndex) => Promise<string[]>;
const lockHooks: LockHook[] = [];
const unlockHooks: UnlockHook[] = [];

export function onLock(hook: LockHook): void {
  lockHooks.push(hook);
}

export function onUnlock(hook: UnlockHook): void {
  unlockHooks.push(hook);
}

interface SessionState {
  booted: boolean;
  initialized: boolean;
  coverId: CoverId;
  unlocked: boolean;
  index: VaultIndex | null;
  boot(): Promise<void>;
  unlock(key: Uint8Array): Promise<void>;
  lock(): void;
  /** Applies a change to the index and persists it encrypted. */
  update(mutate: (index: VaultIndex) => void | Promise<void>): Promise<void>;
  setCover(id: CoverId): Promise<void>;
  markInitialized(): void;
}

export const useSession = create<SessionState>((set, get) => ({
  booted: false,
  initialized: false,
  coverId: 'przepisy',
  unlocked: false,
  index: null,

  async boot() {
    wipeScratch();
    const [initialized, cover] = await Promise.all([keyManager.load(), AsyncStorage.getItem(COVER_KEY)]);
    // A cover removed in an update (e.g. the former calculator) falls back to the default one.
    const known = COVERS.some((c) => c.id === cover);
    set({ booted: true, initialized, coverId: known ? (cover as CoverId) : 'przepisy' });
  },

  async unlock(key) {
    masterKey = key;
    const index = await vaultStore.loadIndex(key);
    // Restored before the vault screens mount, so they see the draft right away.
    const keep = new Set<string>();
    for (const hook of unlockHooks) for (const id of await hook(index).catch(() => [] as string[])) keep.add(id);
    set({ unlocked: true, index, initialized: true });
    // Files no entry and no draft refers to (e.g. a photo taken while the vault was closing).
    void vaultStore.collectGarbage(index, keep).catch(() => undefined);
  },

  lock() {
    if (masterKey) {
      for (const hook of lockHooks) {
        const copy = masterKey.slice();
        void hook(copy)
          .catch(() => undefined)
          .finally(() => wipe(copy));
      }
    }
    wipe(masterKey);
    masterKey = null;
    wipeScratch();
    set({ unlocked: false, index: null });
  },

  update(mutate) {
    const run = updateQueue.then(async () => {
      const current = get().index;
      if (!current) throw new Error('Vault is locked');
      const next: VaultIndex = JSON.parse(JSON.stringify(current));
      await mutate(next);
      const live = requireMasterKey();
      // Encrypt with a copy: a quick exit during the save zeroes the session key, and an
      // index sealed with a zeroed key could never be opened again.
      const key = live.slice();
      try {
        await vaultStore.saveIndex(key, next);
      } finally {
        wipe(key);
      }
      // After a quick exit the decrypted index must not come back into memory.
      if (get().unlocked && masterKey === live) set({ index: next });
    });
    updateQueue = run.catch(() => undefined);
    return run;
  },

  async setCover(id) {
    await AsyncStorage.setItem(COVER_KEY, id);
    // The launcher icon is switched when the vault closes (see quickExit), because
    // Android may close the app when the active launcher alias changes.
    await AsyncStorage.setItem(PENDING_COVER_KEY, id);
    set({ coverId: id });
  },

  markInitialized() {
    set({ initialized: true });
  },
}));

export async function takePendingCoverIcon(): Promise<CoverId | null> {
  const id = (await AsyncStorage.getItem(PENDING_COVER_KEY)) as CoverId | null;
  if (id) await AsyncStorage.removeItem(PENDING_COVER_KEY);
  return id;
}
