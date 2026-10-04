/**
 * @jest-environment node
 *
 * Builds a demo evidence package with real FreeTSA timestamps (for the pitch and for
 * testing verifier/). Skipped unless DEMO_OUT is set:
 *   DEMO_OUT=verifier/demo/sejf-place-demo.zip npx jest demoPackage.live
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { toHex, utf8 } from '@/crypto/bytes';
import { nodeCryptoProvider } from '@/crypto/nodeProvider';
import { setCryptoProvider } from '@/crypto/provider';
import { appendEntry } from '@/integrity/chain';
import { stampHash } from '@/integrity/tsaQueue';
import { buildManifest, buildZip, evidencePath } from '@/report/package';
import type { Attachment, Entry, EntryContent } from '@/vault/types';

import { nodePost } from './helpers/nodeHttp';

const out = process.env.DEMO_OUT;

(out ? it : it.skip)(
  'writes a demo package',
  async () => {
    setCryptoProvider(nodeCryptoProvider);
    const photo = readFileSync(join(__dirname, '..', '..', 'assets', 'covers', 'przepisy.png'));
    const photoAtt: Attachment = {
      id: 'a1b2c3d4e5f60718',
      kind: 'image',
      name: 'zrzut-bankowosc.png',
      mime: 'image/png',
      size: photo.length,
      sha256: toHex(await nodeCryptoProvider.sha256(photo)),
      addedAt: '2026-09-14T18:02:00.000Z',
      source: 'gallery',
    };
    const base = (c: Partial<EntryContent>): EntryContent => ({
      occurredAt: '2026-09-01T20:00',
      occurredApprox: false,
      place: 'mieszkanie',
      forms: ['ekonomiczna'],
      tags: [],
      description: '',
      injuries: false,
      injuriesDescription: '',
      witnesses: '',
      childrenPresent: null,
      isFirst: false,
      attachments: [],
      ...c,
    });
    const contents: EntryContent[] = [
      base({
        occurredAt: '2026-08-03T19:30',
        isFirst: true,
        tags: ['ograniczanie dostępu do pieniędzy'],
        description: 'Zabrał mi kartę do wspólnego konta i powiedział, że od teraz będzie mi dawał 50 zł na tydzień.',
      }),
      base({
        occurredAt: '2026-09-14T17:45',
        forms: ['ekonomiczna', 'psychiczna'],
        tags: ['ograniczanie dostępu do pieniędzy', 'wyzywanie'],
        description: 'Zmienił hasło do bankowości. Kiedy zapytałam o pieniądze na buty dla córki, krzyczał, że jestem pasożytem.',
        childrenPresent: true,
        attachments: [photoAtt],
      }),
      base({
        occurredAt: '2026-09-27T09:10',
        forms: ['ekonomiczna'],
        tags: ['uniemożliwianie podjęcia pracy'],
        description: 'Schował moje dokumenty, kiedy miałam iść na rozmowę o pracę.',
        witnesses: 'sąsiadka',
      }),
    ];
    const entries: Entry[] = [];
    for (const c of contents) entries.push(await appendEntry(entries, c, new Date()));
    for (const e of entries) e.tsa = await stampHash(e.hash, ['https://freetsa.org/tsr'], nodePost);

    const pdf = utf8('%PDF-1.4\n% demo placeholder: the real report is generated on the phone\n%%EOF\n');
    const pdfHash = toHex(await nodeCryptoProvider.sha256(pdf));
    const reportTsa = await stampHash(pdfHash, ['https://freetsa.org/tsr'], nodePost);
    const manifest = buildManifest(entries, 'T-DEMO', new Date().toISOString(), { sha256: pdfHash, tsa: reportTsa });
    const zip = buildZip(manifest, pdf, [{ path: evidencePath(2, photoAtt.name, photoAtt.id), bytes: photo }], entries, reportTsa.tokenB64);
    mkdirSync(dirname(out!), { recursive: true });
    writeFileSync(out!, zip);
    // A deliberately tampered copy for the demo: one word changed in entry 2.
    manifest.entries[1].content!.description = manifest.entries[1].content!.description.replace('krzyczał', 'mówił');
    writeFileSync(out!.replace('.zip', '-zmieniony.zip'), buildZip(manifest, pdf, [{ path: evidencePath(2, photoAtt.name, photoAtt.id), bytes: photo }], entries, reportTsa.tokenB64));
  },
  120_000,
);
