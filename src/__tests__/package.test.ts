/** @jest-environment node */
import { unzipSync } from 'fflate';

import { toHex, utf8 } from '@/crypto/bytes';
import { nodeCryptoProvider } from '@/crypto/nodeProvider';
import { setCryptoProvider } from '@/crypto/provider';
import { appendEntry, tombstone } from '@/integrity/chain';
import { verifyPackage } from '@/integrity/verify';
import { renderReportHtml } from '@/report/html';
import { computeMetrics } from '@/report/metrics';
import { buildReportModel } from '@/report/model';
import { buildManifest, buildZip, evidencePath } from '@/report/package';
import type { Entry, EntryContent } from '@/vault/types';

beforeAll(() => setCryptoProvider(nodeCryptoProvider));

const fixture = require('./fixtures/tsa-token.json');

const content = (over: Partial<EntryContent>): EntryContent => ({
  occurredAt: '2026-09-01T20:00',
  occurredApprox: false,
  place: 'mieszkanie',
  forms: ['ekonomiczna'],
  tags: [],
  description: 'Zabrał mi kartę i powiedział, że nie dostanę pieniędzy na zakupy.',
  injuries: false,
  injuriesDescription: '',
  witnesses: '',
  childrenPresent: true,
  isFirst: false,
  attachments: [],
  ...over,
});

async function samplePackage() {
  const photo = utf8('pretend-jpeg-bytes');
  const photoHash = toHex(await nodeCryptoProvider.sha256(photo));
  const entries: Entry[] = [];
  entries.push(await appendEntry(entries, content({ isFirst: true, occurredAt: '2026-08-01T10:00' })));
  entries.push(
    await appendEntry(
      entries,
      content({
        forms: ['psychiczna', 'ekonomiczna'],
        attachments: [{ id: 'abc123def456', kind: 'photo', name: 'zdjecie.jpg', mime: 'image/jpeg', size: photo.length, sha256: photoHash, addedAt: '2026-09-01T20:05:00Z', source: 'camera' }],
      }),
    ),
  );
  entries.push(await appendEntry(entries, content({ description: 'do usunięcia' })));
  entries[2] = tombstone(entries[2]);
  const manifest = buildManifest(entries, 'R-TEST', '2026-10-01T12:00:00Z');
  const evidence = [{ path: evidencePath(2, 'zdjecie.jpg', 'abc123def456'), bytes: photo }];
  return { entries, manifest, evidence, photo };
}

describe('report model', () => {
  it('groups by NK-A forms and NK-C history without inventing anything', async () => {
    const { entries } = await samplePackage();
    const m = await buildReportModel(entries, { relation: 'mąż', firearm: 'nie wiem', childrenCount: '2', namesToHide: '' });
    expect(m.entries).toHaveLength(2);
    expect(m.deleted).toHaveLength(1);
    expect(m.byForm.find((g) => g.form === 'ekonomiczna')?.seqs).toEqual([1, 2]);
    expect(m.history.first?.seq).toBe(1);
    expect(m.history.firstMarked).toBe(true);
    expect(m.history.last?.seq).toBe(2);
    expect(m.chain.ok).toBe(true);

    const html = renderReportHtml(m, 'R-TEST');
    expect(html).toContain('nie jest formularzem „Niebieska Karta”');
    expect(html).toContain('Zabrał mi kartę i powiedział, że nie dostanę pieniędzy na zakupy.');
    expect(html).toContain('Przemoc ekonomiczna');
  });

  it('escapes user text in the HTML', async () => {
    const entries: Entry[] = [await appendEntry([], content({ description: '<script>alert(1)</script>' }))];
    const html = renderReportHtml(await buildReportModel(entries, { relation: '', firearm: '', childrenCount: '', namesToHide: '' }), 'X');
    expect(html).not.toContain('<script>alert');
    expect(html).toContain('&lt;script&gt;');
  });
});

describe('pilot metrics', () => {
  it('are derived only from the entries and previous exports', async () => {
    const { entries } = await samplePackage();
    // Entry dates come from the clock; pin the first one so the day count is predictable.
    entries[0] = { ...entries[0], createdAt: '2026-08-02T08:00:00Z' };
    const m = computeMetrics(entries, [{ createdAt: '2026-09-01T00:00:00Z', pdfSha256: 'x' }], new Date(2026, 9, 1, 12));
    expect(m).toMatchObject({
      entries: 2,
      entriesWithFiles: 1,
      files: 1,
      stamped: 0,
      firstIncident: '2026-08-01',
      daysFirstIncidentToReport: 61,
      previousExports: 1,
    });
    expect(m.firstEntry).toBe('2026-08-02');
    expect(m.daysFirstEntryToReport).toBe(60);
  });

  it('travel in the manifest without affecting verification', async () => {
    const { entries } = await samplePackage();
    const metrics = computeMetrics(entries, []);
    const manifest = buildManifest(entries, 'R-TEST', '2026-10-01T12:00:00Z', undefined, metrics);
    const files = new Map(Object.entries(unzipSync(buildZip(manifest, null, [], entries))));
    expect(JSON.parse(new TextDecoder().decode(files.get('manifest.json'))).metrics.entries).toBe(2);
    const v = await verifyPackage(files);
    expect(v.entries.every((e) => e.link === 'ok' && e.record !== 'fail')).toBe(true);
  });
});

describe('evidence package', () => {
  it('round-trips through ZIP and verifies', async () => {
    const { entries, manifest, evidence } = await samplePackage();
    const zip = buildZip(manifest, utf8('%PDF-fake'), evidence, entries);
    const files = new Map(Object.entries(unzipSync(zip)));
    expect(files.has('WERYFIKACJA.txt')).toBe(true);
    expect(files.has('certs/freetsa-cacert.pem')).toBe(true);
    const v = await verifyPackage(files);
    expect(v.ok).toBe(true);
    expect(v.entries.map((e) => e.record)).toEqual(['ok', 'ok', 'deleted']);
    expect(v.entries[1].files[0].verdict).toBe('ok');
  });

  it('detects a modified evidence file', async () => {
    const { entries, manifest, evidence } = await samplePackage();
    const files = new Map(Object.entries(unzipSync(buildZip(manifest, null, evidence, entries))));
    const path = evidence[0].path;
    const bytes = files.get(path)!;
    bytes[0] ^= 1;
    const v = await verifyPackage(files);
    expect(v.ok).toBe(false);
    expect(v.entries[1].files[0].verdict).toBe('fail');
  });

  it('detects an edited description in the manifest', async () => {
    const { entries, manifest, evidence } = await samplePackage();
    manifest.entries[0].content!.description += ' (dopisane)';
    const files = new Map(Object.entries(unzipSync(buildZip(manifest, null, evidence, entries))));
    const v = await verifyPackage(files);
    expect(v.ok).toBe(false);
    expect(v.entries[0].record).toBe('fail');
  });

  it('checks that a real RFC 3161 token matches the entry hash', async () => {
    const { entries, evidence } = await samplePackage();
    // Pretend entry 1 hashed to the value the fixture token was issued for: link check fails but token check must pass.
    const forged = entries.map((e, i) => (i === 0 ? { ...e, hash: fixture.hash, tsa: fixture.stamp } : e));
    const manifest = buildManifest(forged, 'R', '2026-10-01T00:00:00Z');
    const files = new Map(Object.entries(unzipSync(buildZip(manifest, null, evidence, forged))));
    const v = await verifyPackage(files);
    expect(v.entries[0].timestamp.verdict).toBe('ok');
    expect(v.entries[0].timestamp.genTime).toBe(fixture.stamp.genTime);
    expect(v.entries[0].record).toBe('fail'); // the content does not hash to the forged value
  });
});
