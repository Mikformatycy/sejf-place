import { File } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { toHex } from '@/crypto/bytes';
import { cryptoProvider } from '@/crypto/provider';
import { expoPostBinary } from '@/integrity/expoHttp';
import { stampHash } from '@/integrity/tsaQueue';
import { isOnline, TSA_TIMEOUT_MS } from '@/vault/actions';
import { scratchDir } from '@/vault/expoAdapters';
import { withExternalActivity } from '@/vault/quickExit';
import { requireMasterKey, useSession, vaultStore } from '@/vault/session';
import type { TsaStamp } from '@/vault/types';

import { renderReportHtml } from './html';
import { computeMetrics } from './metrics';
import { buildReportModel, type AiSummary } from './model';
import { buildManifest, buildZip, evidencePath, type PackageFile } from './package';

const reportId = () => `T-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${toHex(cryptoProvider().randomBytes(3)).toUpperCase()}`;

async function renderPdf(ai?: AiSummary) {
  const { index } = useSession.getState();
  if (!index) throw new Error('Vault is locked');
  const id = reportId();
  const model = await buildReportModel(index.entries, index.profile, ai);
  const { uri } = await Print.printToFileAsync({ html: renderReportHtml(model, id) });
  const file = new File(uri);
  const bytes = await file.bytes();
  file.delete();
  const sha256 = toHex(await cryptoProvider().sha256(bytes));
  let tsa: TsaStamp | undefined;
  try {
    // Offline: the package is still valid, the report just has no timestamp.
    if (await isOnline()) tsa = await stampHash(sha256, index.settings.tsaUrls, expoPostBinary, TSA_TIMEOUT_MS);
  } catch {
    tsa = undefined;
  }
  await useSession.getState().update((idx) => {
    idx.reports.push({ createdAt: new Date().toISOString(), pdfSha256: sha256, ...(tsa ? { tsa } : {}) });
  });
  return { id, bytes, sha256, tsa };
}

async function shareBytes(name: string, bytes: Uint8Array, mimeType: string) {
  const f = new File(scratchDir(), name);
  if (f.exists) f.delete();
  f.create();
  f.write(bytes);
  try {
    await withExternalActivity(() => Sharing.shareAsync(f.uri, { mimeType, dialogTitle: name }));
  } finally {
    if (f.exists) f.delete();
  }
}

export async function sharePdf(ai?: AiSummary): Promise<{ sha256: string; stamped: boolean }> {
  const pdf = await renderPdf(ai);
  await shareBytes(`raport-${pdf.id}.pdf`, pdf.bytes, 'application/pdf');
  return { sha256: pdf.sha256, stamped: !!pdf.tsa };
}

/** Report + original files + tokens + manifest, verifiable without the app. */
export async function sharePackage(ai?: AiSummary): Promise<{ files: number }> {
  const before = useSession.getState().index;
  if (!before) throw new Error('Vault is locked');
  // Counted before this export is recorded.
  const metrics = computeMetrics(before.entries, before.reports);
  const pdf = await renderPdf(ai);
  const index = useSession.getState().index;
  if (!index) throw new Error('Vault is locked');
  const evidence: PackageFile[] = [];
  for (const e of index.entries) {
    for (const a of e.content?.attachments ?? []) {
      evidence.push({ path: evidencePath(e.seq, a.name, a.id), bytes: await vaultStore.getBlob(requireMasterKey(), a.id) });
    }
  }
  const manifest = buildManifest(index.entries, pdf.id, new Date().toISOString(), { sha256: pdf.sha256, tsa: pdf.tsa }, metrics);
  const zip = buildZip(manifest, pdf.bytes, evidence, index.entries, pdf.tsa?.tokenB64);
  await shareBytes(`sejf-place-${pdf.id}.zip`, zip, 'application/zip');
  return { files: evidence.length };
}
