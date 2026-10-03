import { nodeCryptoProvider } from '@/crypto/nodeProvider';
import { setCryptoProvider } from '@/crypto/provider';
import { appendEntry } from '@/integrity/chain';
import { EMPTY_DRAFT, isEmptyDraft, wasDraftSaved, type DraftFields, type StoredDraft } from '@/vault/draft';
import type { Attachment, Entry } from '@/vault/types';

beforeAll(() => setCryptoProvider(nodeCryptoProvider));

const fields = (over: Partial<DraftFields> = {}): DraftFields => ({
  date: '03.10.2026',
  time: '00:40',
  place: '',
  forms: [],
  tags: [],
  description: '',
  injuries: null,
  injuriesDescription: '',
  witnesses: '',
  childrenPresent: null,
  isFirst: false,
  ...over,
});

const photo: Attachment = {
  id: 'aa11bb22cc33dd44',
  kind: 'photo',
  name: 'zdjecie.jpg',
  mime: 'image/jpeg',
  size: 22_000,
  sha256: '0'.repeat(64),
  addedAt: '2026-10-03T00:42:55Z',
  source: 'camera',
};

describe('isEmptyDraft', () => {
  it('treats the prefilled date alone as empty', () => {
    expect(isEmptyDraft(EMPTY_DRAFT)).toBe(true);
    expect(isEmptyDraft({ key: 'new', fields: fields(), attachments: [] })).toBe(true);
  });

  it('keeps anything the user actually entered', () => {
    expect(isEmptyDraft({ key: 'new', fields: fields({ description: 'Zabrał kartę' }), attachments: [] })).toBe(false);
    expect(isEmptyDraft({ key: 'new', fields: fields({ forms: ['ekonomiczna'] }), attachments: [] })).toBe(false);
    expect(isEmptyDraft({ key: 'new', fields: null, attachments: [photo] })).toBe(false);
  });
});

describe('wasDraftSaved', () => {
  async function savedEntry(): Promise<Entry[]> {
    return [
      await appendEntry([], {
        occurredAt: '2026-10-03T00:40',
        occurredApprox: false,
        place: '',
        forms: [],
        tags: [],
        description: 'Szkic przed wyjściem',
        injuries: null,
        injuriesDescription: '',
        witnesses: '',
        childrenPresent: null,
        isFirst: false,
        attachments: [photo],
      }),
    ];
  }

  it('recognises a draft that already became an entry (app killed right after saving)', async () => {
    const entries = await savedEntry();
    const leftover: StoredDraft = { key: 'new', fields: fields({ description: 'Szkic przed wyjściem' }), attachments: [photo] };
    expect(wasDraftSaved(leftover, entries)).toBe(true);
    // Even without files: the same text means the same entry.
    expect(wasDraftSaved({ ...leftover, attachments: [] }, entries)).toBe(true);
  });

  it('keeps a genuinely new draft', async () => {
    const entries = await savedEntry();
    const fresh: StoredDraft = {
      key: 'new',
      fields: fields({ description: 'Następnego dnia znowu' }),
      attachments: [{ ...photo, id: 'ff00ff00ff00ff00' }],
    };
    expect(wasDraftSaved(fresh, entries)).toBe(false);
    expect(wasDraftSaved(fresh, [])).toBe(false);
  });
});
