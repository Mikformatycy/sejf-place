/**
 * Independent verification of an exported evidence package (ZIP contents).
 * Shared by the unit tests and by the browser verifier (verifier/).
 * The CMS signature of tokens is checked separately (openssl / pkijs in the verifier).
 */
import { fromUtf8, toHex } from '@/crypto/bytes';
import { cryptoProvider } from '@/crypto/provider';
import type { Entry } from '@/vault/types';

import { GENESIS_HASH, entryRecord, hashRecord } from './chain';
import { parseToken } from './rfc3161';

type Manifest = import('@/report/package').PackageManifest;

export type Verdict = 'ok' | 'fail' | 'missing' | 'deleted';

export interface EntryVerdict {
  seq: number;
  id: string;
  record: Verdict;
  link: Verdict;
  files: { path: string; verdict: Verdict }[];
  timestamp: { verdict: Verdict; genTime?: string; tsaName?: string; detail?: string };
}

export interface PackageVerdict {
  ok: boolean;
  manifestError?: string;
  entries: EntryVerdict[];
  report?: { verdict: Verdict; timestamp: Verdict };
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  return toHex(await cryptoProvider().sha256(bytes));
}

function checkToken(token: Uint8Array | undefined, expectedHash: string): EntryVerdict['timestamp'] {
  if (!token) return { verdict: 'missing' };
  try {
    const t = parseToken(token);
    if (toHex(t.imprint) !== expectedHash) return { verdict: 'fail', detail: 'token dotyczy innego skrótu' };
    return { verdict: 'ok', genTime: t.genTime.toISOString(), tsaName: t.tsaName };
  } catch (e) {
    return { verdict: 'fail', detail: String(e) };
  }
}

export async function verifyPackage(files: Map<string, Uint8Array>): Promise<PackageVerdict> {
  const raw = files.get('manifest.json');
  if (!raw) return { ok: false, manifestError: 'Brak pliku manifest.json', entries: [] };
  let manifest: Manifest;
  try {
    manifest = JSON.parse(fromUtf8(raw)) as Manifest;
  } catch {
    return { ok: false, manifestError: 'manifest.json jest uszkodzony', entries: [] };
  }

  const entries: EntryVerdict[] = [];
  let prev = manifest.genesisHash ?? GENESIS_HASH;
  let prevSeq = 0;
  for (const e of manifest.entries) {
    const link: Verdict = e.prevHash === prev && e.seq === prevSeq + 1 ? 'ok' : 'fail';
    let record: Verdict = 'deleted';
    if (e.content) {
      const recomputed = await hashRecord(entryRecord(e as Entry, e.content));
      record = recomputed === e.hash ? 'ok' : 'fail';
    }
    const fileVerdicts = [];
    for (const f of e.files) {
      const bytes = files.get(f.path);
      const expected = e.content?.attachments.find((a) => a.id === f.attachmentId)?.sha256;
      fileVerdicts.push({
        path: f.path,
        verdict: (!bytes ? 'missing' : (await sha256Hex(bytes)) === expected ? 'ok' : 'fail') as Verdict,
      });
    }
    const timestamp = e.tsa ? checkToken(files.get(e.tsa.tokenFile), e.hash) : { verdict: 'missing' as Verdict };
    entries.push({ seq: e.seq, id: e.id, record, link, files: fileVerdicts, timestamp });
    prev = e.hash;
    prevSeq = e.seq;
  }

  let report: PackageVerdict['report'];
  if (manifest.report) {
    const pdf = files.get(manifest.report.path);
    const verdict: Verdict = !pdf ? 'missing' : (await sha256Hex(pdf)) === manifest.report.sha256 ? 'ok' : 'fail';
    const timestamp = manifest.report.tsa ? checkToken(files.get(manifest.report.tsa.tokenFile), manifest.report.sha256).verdict : 'missing';
    report = { verdict, timestamp };
  }

  const ok =
    entries.every((e) => e.link === 'ok' && e.record !== 'fail' && e.files.every((f) => f.verdict === 'ok') && e.timestamp.verdict !== 'fail') &&
    (!report || report.verdict === 'ok');
  return { ok, entries, report };
}
