import { nodeCryptoProvider } from '@/crypto/nodeProvider';
import { setCryptoProvider } from '@/crypto/provider';
import { canonicalJson } from '@/integrity/canonicalJson';
import { GENESIS_HASH, appendEntry, tombstone, verifyChain } from '@/integrity/chain';
import type { Entry, EntryContent } from '@/vault/types';

beforeAll(() => setCryptoProvider(nodeCryptoProvider));

const content = (description: string): EntryContent => ({
  occurredAt: '2026-09-12T21:30',
  occurredApprox: false,
  place: 'mieszkanie',
  forms: ['ekonomiczna'],
  tags: ['odebranie karty płatniczej'],
  description,
  injuries: false,
  injuriesDescription: '',
  witnesses: '',
  childrenPresent: null,
  isFirst: false,
  attachments: [],
});

async function chainOf(n: number): Promise<Entry[]> {
  const entries: Entry[] = [];
  for (let i = 0; i < n; i++) entries.push(await appendEntry(entries, content(`zdarzenie ${i}`)));
  return entries;
}

describe('canonicalJson', () => {
  it('sorts keys, drops undefined and is stable', () => {
    expect(canonicalJson({ b: 1, a: [true, null, 'ż'], c: undefined })).toBe('{"a":[true,null,"ż"],"b":1}');
  });
  it('rejects floats', () => {
    expect(() => canonicalJson({ x: 1.5 })).toThrow();
  });
});

describe('hash chain', () => {
  it('links entries from the genesis hash', async () => {
    const entries = await chainOf(3);
    expect(entries[0].prevHash).toBe(GENESIS_HASH);
    expect(entries[1].prevHash).toBe(entries[0].hash);
    expect((await verifyChain(entries)).map((c) => c.status)).toEqual(['ok', 'ok', 'ok']);
  });

  it('detects a single changed character', async () => {
    const entries = await chainOf(3);
    entries[1] = { ...entries[1], content: content('zdarzenie l') };
    expect((await verifyChain(entries)).map((c) => c.status)).toEqual(['ok', 'hash-mismatch', 'ok']);
  });

  it('detects a removed entry', async () => {
    const entries = await chainOf(3);
    entries.splice(1, 1);
    expect((await verifyChain(entries))[1].status).toBe('broken-link');
  });

  it('keeps the chain valid after the user deletes content', async () => {
    const entries = await chainOf(3);
    entries[1] = tombstone(entries[1]);
    expect((await verifyChain(entries)).map((c) => c.status)).toEqual(['ok', 'deleted', 'ok']);
  });
});
