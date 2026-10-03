import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { create } from 'zustand';

import { EMPTY_DRAFT, isEmptyDraft as isEmpty, wasDraftSaved, type DraftFields, type StoredDraft } from './draft';
import { scratchDir } from './expoAdapters';
import { mp4DurationMs } from './mp4';
import { withExternalActivity } from './quickExit';
import { onLock, onUnlock, requireMasterKey, useSession, vaultStore } from './session';
import type { Attachment, AttachmentKind } from './types';

export type { DraftFields } from './draft';

/**
 * The entry being written. It survives leaving the form (an accidental "back") and also
 * a quick exit or the auto-lock: it is kept encrypted in the vault (draft.enc) and comes
 * back on the next unlock. In memory it exists only while the vault is open.
 */
interface DraftState extends StoredDraft {
  setFields(key: string, fields: DraftFields): void;
  add(a: Attachment): void;
  remove(id: string): void;
  /** Forgets the draft; `deleteFiles` also removes its encrypted attachments. */
  reset(deleteFiles?: boolean): void;
}

export const useDraft = create<DraftState>((set, get) => ({
  ...EMPTY_DRAFT,
  setFields: (key, fields) => set({ key, fields }),
  add: (a) => set((s) => ({ attachments: [...s.attachments, a] })),
  remove: (id) => {
    void vaultStore.removeBlob(id).catch(() => undefined);
    set((s) => ({ attachments: s.attachments.filter((a) => a.id !== id) }));
  },
  reset: (deleteFiles = false) => {
    if (deleteFiles) for (const a of get().attachments) void vaultStore.removeBlob(a.id).catch(() => undefined);
    set(EMPTY_DRAFT);
    // Not debounced: a saved entry must never come back as a draft (its files would then be
    // offered for deletion), even if the app is killed right after saving.
    cancelAutosave();
    void writeDraft(EMPTY_DRAFT);
  },
}));

const snapshot = ({ key, fields, attachments }: StoredDraft): StoredDraft => ({ key, fields, attachments });

// Writes run one at a time (they share draft.enc.tmp), each with its own copy of the key.
// An empty draft needs no key: the file is just removed.
let draftWrites: Promise<void> = Promise.resolve();
function writeDraft(d: StoredDraft, keyCopy?: Uint8Array): Promise<void> {
  draftWrites = draftWrites
    .then(() => (isEmpty(d) || !keyCopy ? vaultStore.clearDraft() : vaultStore.saveDraft(keyCopy, d)))
    .catch(() => undefined);
  return draftWrites;
}

// Autosave shortly after the user stops typing.
const AUTOSAVE_MS = 800;
let autosave: ReturnType<typeof setTimeout> | null = null;
function cancelAutosave() {
  if (autosave) clearTimeout(autosave);
  autosave = null;
}
useDraft.subscribe((d, prev) => {
  if (!useSession.getState().unlocked || (isEmpty(d) && isEmpty(prev))) return;
  cancelAutosave();
  autosave = setTimeout(() => {
    autosave = null;
    if (!useSession.getState().unlocked) return;
    const copy = requireMasterKey().slice();
    void writeDraft(snapshot(useDraft.getState()), copy).finally(() => copy.fill(0));
  }, AUTOSAVE_MS);
});

// Locking: save what is on screen right now, then drop it from memory.
onLock((keyCopy) => {
  cancelAutosave();
  return writeDraft(snapshot(useDraft.getState()), keyCopy);
});
useSession.subscribe((s, prev) => {
  if (prev.unlocked && !s.unlocked) useDraft.setState(EMPTY_DRAFT);
});

// Unlocking: bring the draft back; its files must survive the garbage collection.
onUnlock(async (index) => {
  const stored = await vaultStore.loadDraft<StoredDraft>(requireMasterKey());
  if (!stored) return [];
  if (wasDraftSaved(stored, index.entries)) {
    await vaultStore.clearDraft();
    return [];
  }
  useDraft.setState(snapshot(stored));
  return stored.attachments.map((a) => a.id);
});

function deleteQuietly(uri: string) {
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {
    // The OS may already have removed the temporary copy.
  }
}

/**
 * Reads a temporary file produced by the camera/recorder/picker, encrypts it into the vault
 * and deletes the plaintext copy. The SHA-256 is taken from the original bytes.
 */
export async function ingestFile(
  uri: string,
  meta: { kind: AttachmentKind; name: string; mime: string; source: Attachment['source']; durationMs?: number },
  deleteOriginal = true,
): Promise<Attachment> {
  try {
    const bytes = await new File(uri).bytes();
    const { id, sha256 } = await vaultStore.putBlob(requireMasterKey(), bytes);
    return { id, sha256, size: bytes.length, addedAt: new Date().toISOString(), ...meta };
  } finally {
    if (deleteOriginal) deleteQuietly(uri);
  }
}

export async function pickFromGallery(): Promise<Attachment | null> {
  const result = await withExternalActivity(() =>
    ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1, exif: true }),
  );
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  // The picker hands us a private copy; the original stays in the gallery (the user is reminded to delete it).
  return ingestFile(asset.uri, {
    kind: 'image',
    name: asset.fileName ?? `obraz-${Date.now()}.jpg`,
    mime: asset.mimeType ?? 'image/jpeg',
    source: 'gallery',
  });
}

export async function pickDocument(): Promise<Attachment | null> {
  const result = await withExternalActivity(() => DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false }));
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  return ingestFile(asset.uri, {
    kind: 'document',
    name: asset.name,
    mime: asset.mimeType ?? 'application/octet-stream',
    source: 'files',
  });
}

/**
 * Decrypts an attachment into the scratch directory for the image view, the audio player
 * or the share sheet. The directory is app-private and wiped on every lock and start.
 * (Images used to go through a base64 data URI, which takes seconds for a camera photo.)
 */
export async function attachmentTempFile(a: Attachment, prefix = ''): Promise<File> {
  const bytes = await vaultStore.getBlob(requireMasterKey(), a.id);
  const safeName = a.name.replace(/[^\w.\-]+/g, '_');
  const f = new File(scratchDir(), `${prefix}${a.id.slice(0, 8)}-${safeName}`);
  if (f.exists) f.delete();
  f.create();
  f.write(bytes);
  return f;
}

export function deleteTempFile(f: File | null): void {
  if (f) deleteQuietly(f.uri);
}

/**
 * Photo previews for the entry list: each is decrypted once per unlock, one at a time so
 * the list stays responsive, into its own file (the entry screen deletes its copies).
 * The files go with the scratch dir on lock.
 */
const thumbs = new Map<string, Promise<string>>();
let thumbQueue: Promise<unknown> = Promise.resolve();

export function thumbnailUri(a: Attachment): Promise<string> {
  let uri = thumbs.get(a.id);
  if (!uri) {
    uri = thumbQueue.then(() => attachmentTempFile(a, 'th-')).then((f) => f.uri);
    thumbQueue = uri.catch(() => undefined);
    uri.catch(() => thumbs.delete(a.id));
    thumbs.set(a.id, uri);
  }
  return uri;
}

const durations = new Map<string, Promise<number | null>>();

/** Length of a recording: stored since recordings carry it, read from the file for older ones. */
export function recordingDurationMs(a: Attachment): Promise<number | null> {
  if (a.durationMs) return Promise.resolve(a.durationMs);
  let ms = durations.get(a.id);
  if (!ms) {
    ms = thumbQueue.then(async () => mp4DurationMs(await vaultStore.getBlob(requireMasterKey(), a.id)));
    thumbQueue = ms.catch(() => undefined);
    ms.catch(() => durations.delete(a.id));
    durations.set(a.id, ms);
  }
  return ms;
}

onLock(async () => {
  thumbs.clear();
  durations.clear();
  thumbQueue = Promise.resolve();
});
