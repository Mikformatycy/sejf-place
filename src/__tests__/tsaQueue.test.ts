import { nodeCryptoProvider } from '@/crypto/nodeProvider';
import { setCryptoProvider } from '@/crypto/provider';
import { appendEntry } from '@/integrity/chain';
import type { PostBinary } from '@/integrity/rfc3161';
import { stampPending } from '@/integrity/tsaQueue';
import type { Entry, EntryContent } from '@/vault/types';

beforeAll(() => setCryptoProvider(nodeCryptoProvider));

const content: EntryContent = {
  occurredAt: '2026-09-12T21:30',
  occurredApprox: false,
  place: '',
  forms: ['ekonomiczna'],
  tags: [],
  description: 'Zabrał kartę do konta.',
  injuries: null,
  injuriesDescription: '',
  witnesses: '',
  childrenPresent: null,
  isFirst: false,
  attachments: [],
};

async function chain(n: number): Promise<Entry[]> {
  const entries: Entry[] = [];
  for (let i = 0; i < n; i++) entries.push(await appendEntry(entries, content));
  return entries;
}

describe('stampPending', () => {
  it('stops after the first entry every TSA failed for (offline), instead of timing out per entry', async () => {
    const entries = await chain(5);
    const post = jest.fn<ReturnType<PostBinary>, Parameters<PostBinary>>(async () => {
      throw new Error('network down');
    });
    const r = await stampPending(entries, ['https://a.example/tsr', 'https://b.example/tsr'], post);
    expect(r).toEqual({ stamped: 0, failed: 5 });
    expect(post).toHaveBeenCalledTimes(2); // one entry x two servers, not 5 x 2
  });

  it('skips entries that already have a timestamp', async () => {
    const entries = await chain(3);
    entries[0].tsa = { url: 'x', genTime: '', serial: '', policy: '', tsaName: '', tokenB64: '' };
    const post = jest.fn<ReturnType<PostBinary>, Parameters<PostBinary>>(async () => ({ status: 503, body: new Uint8Array() }));
    const r = await stampPending(entries, ['https://a.example/tsr'], post);
    expect(r).toEqual({ stamped: 0, failed: 2 });
  });
});
