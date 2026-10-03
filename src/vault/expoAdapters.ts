import { Directory, File, Paths } from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';

import type { SecretStore } from './keys';
import type { BlobFS } from './store';

const SECURE_OPTIONS: SecureStore.SecureStoreOptions = {
  // Never synced to iCloud / other devices; readable only while the phone is unlocked.
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export const secureStore: SecretStore = {
  get: (key) => SecureStore.getItemAsync(key, SECURE_OPTIONS),
  set: (key, value) => SecureStore.setItemAsync(key, value, SECURE_OPTIONS),
  del: (key) => SecureStore.deleteItemAsync(key, SECURE_OPTIONS),
};

/** App-private directory (not visible in the gallery or file managers). */
export class ExpoBlobFS implements BlobFS {
  private readonly dir = new Directory(Paths.document, 'v');

  private ensureDir() {
    if (!this.dir.exists) this.dir.create({ intermediates: true });
  }

  async read(name: string) {
    const f = new File(this.dir, name);
    return f.exists ? f.bytes() : null;
  }

  async write(name: string, data: Uint8Array) {
    this.ensureDir();
    // Write to a temp file first so a crash never leaves a half-written index.
    const tmp = new File(this.dir, `${name}.tmp`);
    if (tmp.exists) tmp.delete();
    tmp.create();
    tmp.write(data);
    const dst = new File(this.dir, name);
    if (dst.exists) dst.delete();
    tmp.move(dst);
  }

  async remove(name: string) {
    const f = new File(this.dir, name);
    if (f.exists) f.delete();
  }

  async list() {
    if (!this.dir.exists) return [];
    return this.dir.list().map((e) => e.name);
  }
}

/** Decrypted files needed by other components (audio player, PDF, share sheet). Wiped on lock. */
export const scratchDir = () => {
  const dir = new Directory(Paths.cache, 'tmp-x');
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
};

// Where expo-camera, expo-audio and the pickers leave their plaintext copies. A photo or a
// recording interrupted by a quick exit would otherwise stay there unencrypted.
const PLAINTEXT_CACHES = ['tmp-x', 'Camera', 'Audio', 'ImagePicker', 'DocumentPicker'];

export function wipeScratch(): void {
  for (const name of PLAINTEXT_CACHES) {
    try {
      const dir = new Directory(Paths.cache, name);
      if (dir.exists) dir.delete();
    } catch {
      // Best effort: a file still held open by the OS is removed on the next start.
    }
  }
}
