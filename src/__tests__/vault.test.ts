import { utf8 } from '@/crypto/bytes';
import { nodeCryptoProvider } from '@/crypto/nodeProvider';
import { setCryptoProvider } from '@/crypto/provider';
import { KeyManager, MemorySecretStore } from '@/vault/keys';
import { MemoryBlobFS, VaultStore } from '@/vault/store';

// Low scrypt cost keeps the test fast; production uses DEFAULT_KDF.
const FAST_KDF = { N: 2 ** 10, r: 8, p: 1 };
const SECRET = 'przepisy|editIngredient|sernik/0|1234';

beforeAll(() => setCryptoProvider(nodeCryptoProvider));

describe('KeyManager', () => {
  it('unlocks only with the exact canonical secret', async () => {
    const store = new MemorySecretStore();
    const km = new KeyManager(store, FAST_KDF);
    const mk = await km.initialize(SECRET);

    const reloaded = new KeyManager(store, FAST_KDF);
    expect(await reloaded.load()).toBe(true);
    expect(await reloaded.tryUnlock(SECRET)).toEqual(mk);
    expect(await reloaded.tryUnlock('przepisy|editIngredient|szarlotka/0|1234')).toBeNull();
    expect(await reloaded.tryUnlock('kalkulator|eq||1234')).toBeNull();
  });

  it('prefilter accepts the secret and rejects most other inputs', async () => {
    const km = new KeyManager(new MemorySecretStore(), FAST_KDF);
    await km.initialize(SECRET);
    expect(km.prefilter(SECRET)).toBe(true);
    let hits = 0;
    for (let i = 0; i < 2000; i++) if (km.prefilter(`kalkulator|eq||${i}`)) hits++;
    expect(hits).toBeLessThan(5); // 16-bit tag => ~0.03 expected hits
  });

  it('re-keying makes the old secret stop working', async () => {
    const store = new MemorySecretStore();
    const km = new KeyManager(store, FAST_KDF);
    const mk = await km.initialize(SECRET);
    await km.setSecret(mk, 'kalkulator|eq||19+84');
    expect(await km.tryUnlock(SECRET)).toBeNull();
    expect(await km.tryUnlock('kalkulator|eq||19+84')).toEqual(mk);
  });

  it('nothing in the secret store reveals the secret or the purpose', async () => {
    const store = new MemorySecretStore();
    await new KeyManager(store, FAST_KDF).initialize(SECRET);
    const dump = JSON.stringify([...store.data]);
    expect(dump).not.toMatch(/sernik|1234|przepisy|teczka|przemoc/i);
  });

  it('concurrent initialisations never leave mismatched key material', async () => {
    // Regression: two overlapping initialise() calls used to interleave keystore writes.
    const store = new MemorySecretStore();
    const km = new KeyManager(store, FAST_KDF);
    const [, mk2] = await Promise.all([km.initialize(SECRET), km.initialize(SECRET)]);
    const reloaded = new KeyManager(store, FAST_KDF);
    expect(await reloaded.load()).toBe(true);
    expect(await reloaded.tryUnlock(SECRET)).toEqual(mk2);
  });

  it('upgrades vaults created with slower KDF parameters', async () => {
    const store = new MemorySecretStore();
    const mk = await new KeyManager(store, { N: 2 ** 11, r: 8, p: 1 }).initialize(SECRET);
    const km = new KeyManager(store, FAST_KDF);
    await km.load();
    expect(km.needsKdfUpgrade()).toBe(true);
    await km.setSecret(mk, SECRET);
    expect(km.needsKdfUpgrade()).toBe(false);
    expect(await km.tryUnlock(SECRET)).toEqual(mk);
  });

  it('destroy forgets everything', async () => {
    const store = new MemorySecretStore();
    const km = new KeyManager(store, FAST_KDF);
    await km.initialize(SECRET);
    await km.destroy();
    expect(store.data.size).toBe(0);
    expect(await new KeyManager(store).load()).toBe(false);
  });
});

describe('VaultStore', () => {
  it('stores only ciphertext and detects tampering', async () => {
    const fs = new MemoryBlobFS();
    const vault = new VaultStore(fs);
    const mk = nodeCryptoProvider.randomBytes(32);
    const jpeg = Uint8Array.of(0xff, 0xd8, 0xff, 0xe0, ...utf8('zdjęcie siniaka'));

    const { id, sha256 } = await vault.putBlob(mk, jpeg);
    expect(sha256).toHaveLength(64);
    const onDisk = fs.files.get(`b_${id}.enc`)!;
    expect([...onDisk.slice(0, 3)]).not.toEqual([0xff, 0xd8, 0xff]);
    expect(await vault.getBlob(mk, id)).toEqual(jpeg);

    onDisk[20] ^= 1;
    await expect(vault.getBlob(mk, id)).rejects.toThrow();
  });

  it('round-trips the index and garbage-collects orphan blobs', async () => {
    const fs = new MemoryBlobFS();
    const vault = new VaultStore(fs);
    const mk = nodeCryptoProvider.randomBytes(32);
    const index = await vault.loadIndex(mk);
    index.profile.relation = 'mąż';
    await vault.saveIndex(mk, index);
    expect((await vault.loadIndex(mk)).profile.relation).toBe('mąż');
    await expect(vault.loadIndex(nodeCryptoProvider.randomBytes(32))).rejects.toThrow();

    await vault.putBlob(mk, utf8('orphan'));
    expect(await vault.collectGarbage(index)).toBe(1);
  });

  it('keeps the unsaved draft encrypted and its files out of garbage collection', async () => {
    const fs = new MemoryBlobFS();
    const vault = new VaultStore(fs);
    const mk = nodeCryptoProvider.randomBytes(32);
    const index = await vault.loadIndex(mk);
    const photo = await vault.putBlob(mk, utf8('zdjęcie z szkicu'));
    const draft = { key: 'new', fields: { description: 'Zabrał kartę do konta' }, attachments: [{ id: photo.id }] };

    await vault.saveDraft(mk, draft);
    expect(new TextDecoder().decode(fs.files.get('draft.enc')!)).not.toContain('kartę');
    expect(await vault.loadDraft(mk)).toEqual(draft);

    // The draft's photo is kept when its id is passed in; draft.enc itself is never collected.
    expect(await vault.collectGarbage(index, new Set([photo.id]))).toBe(0);
    expect(fs.files.has('draft.enc')).toBe(true);

    await vault.clearDraft();
    expect(await vault.loadDraft(mk)).toBeNull();
  });

  it('drops a draft it cannot decrypt (e.g. left over from a wiped vault)', async () => {
    const fs = new MemoryBlobFS();
    const vault = new VaultStore(fs);
    await vault.saveDraft(nodeCryptoProvider.randomBytes(32), { key: 'new' });
    expect(await vault.loadDraft(nodeCryptoProvider.randomBytes(32))).toBeNull();
    expect(fs.files.has('draft.enc')).toBe(false);
  });
});
