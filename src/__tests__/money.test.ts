/** @jest-environment node */
import { unzipSync } from 'fflate';

import { amountField, formatAmount, parseAmount } from '@/content/pieniadze';
import { nodeCryptoProvider } from '@/crypto/nodeProvider';
import { setCryptoProvider } from '@/crypto/provider';
import { appendEntry, entryRecord, hashRecord } from '@/integrity/chain';
import { verifyPackage } from '@/integrity/verify';
import { renderReportHtml } from '@/report/html';
import { buildReportModel } from '@/report/model';
import { buildManifest, buildZip } from '@/report/package';
import type { Entry, EntryContent, MoneyAmount } from '@/vault/types';

beforeAll(() => setCryptoProvider(nodeCryptoProvider));

const content = (over: Partial<EntryContent> = {}): EntryContent => ({
  occurredAt: '2026-09-01T20:00',
  occurredApprox: false,
  place: '',
  forms: ['ekonomiczna'],
  tags: [],
  description: '',
  injuries: null,
  injuriesDescription: '',
  witnesses: '',
  childrenPresent: null,
  isFirst: false,
  attachments: [],
  ...over,
});

const amt = (tag: string, amount: number): MoneyAmount[] => [{ tag, amount, currency: 'PLN' }];

describe('amounts', () => {
  it.each([
    ['800', 80000],
    ['1 250,50', 125050],
    ['1250.5', 125050],
    ['99,9 zł', 9990],
    ['0,05', 5],
  ])('parses %s', (text, grosze) => expect(parseAmount(text)).toBe(grosze));

  it('empty field means no amount, nonsense is rejected', () => {
    expect(parseAmount('  ')).toBeNull();
    expect(parseAmount('abc')).toBeNaN();
    expect(parseAmount('-50')).toBeNaN();
    expect(parseAmount('12,345')).toBeNaN();
  });

  it('formats and round-trips', () => {
    expect(formatAmount(125050)).toBe('1 250,50 zł');
    expect(formatAmount(80000)).toBe('800 zł');
    expect(parseAmount(amountField(125050))).toBe(125050);
    expect(amountField(80000)).toBe('800');
  });
});

describe('money in the chain and report', () => {
  it('entries without money keep the hash they had before the field existed', async () => {
    const base = { id: 'a1', seq: 1, createdAt: '2026-09-01T18:00:00.000Z', prevHash: '0'.repeat(64) };
    const c = content({ description: 'stary wpis' });
    expect(await hashRecord(entryRecord(base, { ...c, money: undefined }))).toBe(await hashRecord(entryRecord(base, c)));
  });

  it('sums only typed amounts, and a correction replaces the corrected entry', async () => {
    const entries: Entry[] = [];
    entries.push(await appendEntry(entries, content({ tags: ['niełożenie na utrzymanie'], amounts: amt('niełożenie na utrzymanie', 80000) })));
    entries.push(await appendEntry(entries, content({ tags: ['niełożenie na utrzymanie'], amounts: amt('niełożenie na utrzymanie', 50000) })));
    entries.push(await appendEntry(entries, content({ tags: ['odmowa pieniędzy'], description: 'Nie dał na leki.', money: { kind: 'odmowa', amount: 3000, currency: 'PLN' } })));
    // Wrong amount in entry 2, corrected to 60000.
    entries.push(await appendEntry(entries, content({ tags: ['niełożenie na utrzymanie'], amounts: amt('niełożenie na utrzymanie', 60000), correctionOf: entries[1].id })));

    const model = await buildReportModel(entries, { relation: '', firearm: '', childrenCount: '', namesToHide: '' });
    expect(model.money).toEqual([
      { label: 'niełożenie na utrzymanie', count: 2, total: 140000 },
      // First version stored {kind, amount}; still read.
      { label: 'odmowa pieniędzy', count: 1, total: 3000 },
    ]);

    const html = renderReportHtml(model, 'R-1');
    expect(html).toContain('Suma kwot wpisanych przez autorkę');
    expect(html).toContain('1 400 zł');
    expect(html).toContain('niełożenie na utrzymanie: 800 zł');
  });

  it('a package with money entries still verifies', async () => {
    const entries: Entry[] = [];
    entries.push(await appendEntry(entries, content({ amounts: amt('dług zaciągnięty bez zgody', 1500000) })));
    entries.push(await appendEntry(entries, content({ description: 'bez kwoty' })));
    const manifest = buildManifest(entries, 'R-TEST', '2026-10-01T12:00:00Z');
    const files = new Map(Object.entries(unzipSync(buildZip(manifest, null, [], entries))));
    const v = await verifyPackage(files);
    expect(v.entries.map((e) => [e.link, e.record])).toEqual([
      ['ok', 'ok'],
      ['ok', 'ok'],
    ]);
  });
});
