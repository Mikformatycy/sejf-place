import { zipSync, type Zippable } from 'fflate';

import { fromBase64, utf8 } from '@/crypto/bytes';
import { FREETSA_CACERT_PEM, FREETSA_TSA_CRT_PEM } from '@/content/tsaCerts';
import { GENESIS_HASH, RECORD_VERSION } from '@/integrity/chain';
import type { Entry, EntryContent, TsaStamp } from '@/vault/types';

import type { PilotMetrics } from './metrics';

export const PACKAGE_FORMAT = 'teczka-pakiet/1';

type StampRef = Omit<TsaStamp, 'tokenB64'> & { tokenFile: string };

export interface ManifestEntry {
  id: string;
  seq: number;
  createdAt: string;
  prevHash: string;
  hash: string;
  deletedAt?: string;
  content: EntryContent | null;
  tsa?: StampRef;
  files: { attachmentId: string; path: string }[];
}

export interface PackageManifest {
  format: typeof PACKAGE_FORMAT;
  generatedAt: string;
  reportId: string;
  hashAlgorithm: 'SHA-256';
  recordVersion: number;
  genesisHash: string;
  /** How an entry hash is computed, for independent verifiers. */
  entryHashRule: string;
  entries: ManifestEntry[];
  report?: { path: string; sha256: string; tsa?: StampRef };
  /** Derived numbers for a pilot with a support organisation; not part of the evidence chain. */
  metrics?: PilotMetrics;
}

const safe = (s: string) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^\w.\-]+/g, '_').slice(0, 60);
const pad = (n: number) => String(n).padStart(3, '0');

export const evidencePath = (seq: number, name: string, id: string) => `dowody/${pad(seq)}-${id.slice(0, 6)}-${safe(name)}`;
export const tokenPath = (seq: number, id: string) => `tsr/${pad(seq)}-${id}.tsr`;

function stampRef(t: TsaStamp, tokenFile: string): StampRef {
  const { tokenB64: _token, ...rest } = t;
  return { ...rest, tokenFile };
}

export function buildManifest(
  entries: Entry[],
  reportId: string,
  generatedAt: string,
  report?: { sha256: string; tsa?: TsaStamp },
  metrics?: PilotMetrics,
): PackageManifest {
  return {
    format: PACKAGE_FORMAT,
    generatedAt,
    reportId,
    hashAlgorithm: 'SHA-256',
    recordVersion: RECORD_VERSION,
    genesisHash: GENESIS_HASH,
    entryHashRule:
      'hash = SHA-256( UTF-8( JCS({"v":recordVersion,"id","seq","createdAt","prevHash","content"}) ) ); ' +
      'JCS = obiekt z kluczami posortowanymi, bez spacji (RFC 8785). Pierwszy wpis ma prevHash = genesisHash.',
    entries: entries.map((e) => ({
      id: e.id,
      seq: e.seq,
      createdAt: e.createdAt,
      prevHash: e.prevHash,
      hash: e.hash,
      ...(e.deletedAt ? { deletedAt: e.deletedAt } : {}),
      content: e.content,
      ...(e.tsa ? { tsa: stampRef(e.tsa, tokenPath(e.seq, e.id)) } : {}),
      files: (e.content?.attachments ?? []).map((a) => ({ attachmentId: a.id, path: evidencePath(e.seq, a.name, a.id) })),
    })),
    ...(report
      ? { report: { path: 'raport.pdf', sha256: report.sha256, ...(report.tsa ? { tsa: stampRef(report.tsa, 'tsr/raport.tsr') } : {}) } }
      : {}),
    ...(metrics ? { metrics } : {}),
  };
}

export function verificationReadme(m: PackageManifest): string {
  const example = m.entries.find((e) => e.tsa);
  return [
    'WERYFIKACJA PAKIETU DOWODÓW (sejf-place)',
    `Identyfikator raportu: ${m.reportId}`,
    `Wygenerowano: ${m.generatedAt}`,
    '',
    'Pakiet zawiera:',
    '  raport.pdf         chronologia zdarzeń',
    '  manifest.json      wszystkie wpisy (treść, skróty SHA-256, dane znaczników czasu);',
    '                     pole "metrics" to liczby do pilotażu, wyliczone z wpisów',
    '  dowody/            oryginalne pliki (zdjęcia, nagrania, dokumenty), bajt w bajt',
    '  tsr/               tokeny znaczników czasu RFC 3161 (format DER)',
    '  certs/             certyfikaty urzędu znacznika czasu FreeTSA',
    '',
    '1. Sprawdzenie plików',
    '   Policz SHA-256 każdego pliku z katalogu dowody/ i porównaj z polem "sha256" w manifest.json:',
    '     Linux/macOS: sha256sum dowody/*',
    '     Windows:     certutil -hashfile "dowody\\NAZWA_PLIKU" SHA256',
    '',
    '2. Sprawdzenie łańcucha wpisów',
    `   ${m.entryHashRule}`,
    '   Każdy wpis ma prevHash równy hash poprzedniego wpisu. Najprościej sprawdzić to stroną weryfikatora',
    '   (verifier/index.html w repozytorium projektu): wystarczy przeciągnąć na nią ten plik ZIP.',
    '',
    '3. Sprawdzenie znacznika czasu (openssl)',
    '   Podgląd tokenu:',
    '     openssl ts -reply -in tsr/PLIK.tsr -token_in -text',
    '   Weryfikacja podpisu i skrótu (tokeny z FreeTSA):',
    '     openssl ts -verify -digest HASH_WPISU -in tsr/PLIK.tsr -token_in -CAfile certs/freetsa-cacert.pem -untrusted certs/freetsa-tsa.crt',
    ...(example?.tsa
      ? ['   Przykład dla wpisu nr ' + example.seq + ':', `     openssl ts -verify -digest ${example.hash} -in ${example.tsa.tokenFile} -token_in -CAfile certs/freetsa-cacert.pem -untrusted certs/freetsa-tsa.crt`]
      : []),
    '   Oczekiwany wynik: "Verification: OK".',
    '   Tokeny innego urzędu (np. Sectigo) zawierają jego certyfikaty; do weryfikacji potrzebny jest certyfikat główny tego wystawcy.',
    '',
    'Co potwierdza znacznik czasu: że wpis o danym skrócie istniał najpóźniej w czasie podanym w tokenie i od tamtej pory się nie zmienił.',
    'Czego nie potwierdza: czasu samego zdarzenia ani prawdziwości treści.',
    '',
    'Wpisy z polem "deletedAt" mają usuniętą treść (decyzja autorki). Ich skrót pozostał w łańcuchu, więc kolejne wpisy nadal da się zweryfikować.',
  ].join('\n');
}

export interface PackageFile {
  path: string;
  bytes: Uint8Array;
}

/** Assembles the ZIP. Media are stored without recompression. */
export function buildZip(manifest: PackageManifest, pdf: Uint8Array | null, evidence: PackageFile[], entries: Entry[], reportToken?: string): Uint8Array {
  const files: Zippable = {
    'manifest.json': utf8(JSON.stringify(manifest, null, 2)),
    'WERYFIKACJA.txt': utf8(verificationReadme(manifest)),
    'certs/freetsa-cacert.pem': utf8(FREETSA_CACERT_PEM),
    'certs/freetsa-tsa.crt': utf8(FREETSA_TSA_CRT_PEM),
  };
  if (pdf) files['raport.pdf'] = [pdf, { level: 0 }];
  for (const f of evidence) files[f.path] = [f.bytes, { level: 0 }];
  for (const e of entries) if (e.tsa) files[tokenPath(e.seq, e.id)] = fromBase64(e.tsa.tokenB64);
  if (reportToken) files['tsr/raport.tsr'] = fromBase64(reportToken);
  return zipSync(files, { level: 6 });
}
