// Browser verifier for sejf-place evidence packages. Everything runs locally in the browser;
// the ZIP never leaves the computer.
import { unzipSync } from 'fflate';

import { fromUtf8, utf8 } from '@/crypto/bytes';
import { setCryptoProvider, type CryptoProvider } from '@/crypto/provider';
import { canonicalJson } from '@/integrity/canonicalJson';
import { entryRecord } from '@/integrity/chain';
import { verifyTokenSignature, type SignatureVerdict } from '@/integrity/signature';
import { verifyPackage, type Verdict } from '@/integrity/verify';
import type { PackageManifest } from '@/report/package';
import type { Entry } from '@/vault/types';

const webProvider: CryptoProvider = {
  randomBytes: (n) => crypto.getRandomValues(new Uint8Array(n)),
  sha256: async (d) => new Uint8Array(await crypto.subtle.digest('SHA-256', d as Uint8Array<ArrayBuffer>)),
  aesGcmEncrypt: () => Promise.reject(new Error('not used')),
  aesGcmDecrypt: () => Promise.reject(new Error('not used')),
};
setCryptoProvider(webProvider);

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

const BADGE: Record<Verdict | 'unknown', string> = {
  ok: '<span class="b ok">✓ zgodne</span>',
  fail: '<span class="b fail">✗ niezgodne</span>',
  missing: '<span class="b warn">— brak</span>',
  deleted: '<span class="b muted">treść usunięta</span>',
  unknown: '<span class="b muted">?</span>',
};

function sigBadge(v: SignatureVerdict | null): string {
  if (!v) return BADGE.missing;
  if (!v.signatureValid) return `<span class="b fail" title="${esc(v.message ?? '')}">✗ podpis nieważny</span>`;
  if (v.chainTrusted === true) return `<span class="b ok">✓ podpis ${esc(v.signer)}</span>`;
  return `<span class="b warn" title="${esc(v.message ?? '')}">✓ podpis, nieznany wystawca</span>`;
}

async function verify(file: File) {
  const out = $('out');
  out.innerHTML = '<p>Sprawdzam…</p>';
  let files: Map<string, Uint8Array>;
  try {
    files = new Map(Object.entries(unzipSync(new Uint8Array(await file.arrayBuffer()))));
  } catch {
    out.innerHTML = '<p class="fail">To nie jest poprawny plik ZIP.</p>';
    return;
  }
  const result = await verifyPackage(files);
  if (result.manifestError) {
    out.innerHTML = `<p class="fail">${esc(result.manifestError)}</p>`;
    return;
  }
  const manifest = JSON.parse(fromUtf8(files.get('manifest.json')!)) as PackageManifest;
  const roots = [...files].filter(([p]) => p.startsWith('certs/') && p.endsWith('cacert.pem')).map(([, b]) => fromUtf8(b));

  // CMS signatures: the signed imprint is SHA-256 of the canonical entry record.
  const sigs = new Map<number, SignatureVerdict | null>();
  for (const e of manifest.entries) {
    const token = e.tsa ? files.get(e.tsa.tokenFile) : undefined;
    if (!token || !e.content) {
      sigs.set(e.seq, null);
      continue;
    }
    const data = utf8(canonicalJson(entryRecord(e as unknown as Entry, e.content)));
    sigs.set(e.seq, await verifyTokenSignature(token, data, roots));
  }
  let reportSig: SignatureVerdict | null = null;
  if (manifest.report?.tsa) {
    const token = files.get(manifest.report.tsa.tokenFile);
    const pdf = files.get(manifest.report.path);
    if (token && pdf) reportSig = await verifyTokenSignature(token, pdf, roots);
  }

  const allSigsOk = [...sigs.values(), reportSig].every((s) => s === null || s.signatureValid);
  const ok = result.ok && allSigsOk;
  const rows = result.entries
    .map((e) => {
      const m = manifest.entries.find((x) => x.seq === e.seq)!;
      return `<tr>
        <td>${e.seq}</td>
        <td>${m.content ? esc(m.content.occurredAt.replace('T', ' ')) : '—'}</td>
        <td>${BADGE[e.record]}</td>
        <td>${BADGE[e.link]}</td>
        <td>${e.files.length ? e.files.map((f) => BADGE[f.verdict]).join(' ') : '<span class="muted">brak</span>'}</td>
        <td>${e.timestamp.genTime ? esc(new Date(e.timestamp.genTime).toLocaleString('pl-PL')) : BADGE[e.timestamp.verdict]}</td>
        <td>${sigBadge(sigs.get(e.seq) ?? null)}</td>
      </tr>`;
    })
    .join('');

  out.innerHTML = `
    <div class="summary ${ok ? 'ok' : 'fail'}">${ok ? '✓ Pakiet jest spójny: żaden plik ani wpis nie został zmieniony.' : '✗ Wykryto niezgodność. Szczegóły w tabeli.'}</div>
    <p class="muted">Raport ${esc(manifest.reportId)} · wygenerowano ${esc(new Date(manifest.generatedAt).toLocaleString('pl-PL'))} · wpisów: ${manifest.entries.length}</p>
    ${
      result.report
        ? `<p>Raport PDF: ${BADGE[result.report.verdict]} · znacznik czasu raportu: ${sigBadge(reportSig)}</p>`
        : ''
    }
    <table>
      <thead><tr><th>Nr</th><th>Zdarzenie</th><th>Treść wpisu</th><th>Łańcuch</th><th>Pliki</th><th>Znacznik czasu</th><th>Podpis TSA</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p class="muted">„Treść wpisu” to ponownie policzony skrót SHA-256 kanonicznego zapisu wpisu. „Łańcuch” to powiązanie z poprzednim wpisem.
    „Podpis TSA” oznacza kryptograficzne sprawdzenie tokenu RFC 3161 i jego certyfikatu (jak <code>openssl ts -verify</code>).</p>`;
}

const drop = $('drop');
const input = $<HTMLInputElement>('file');
drop.addEventListener('dragover', (e) => {
  e.preventDefault();
  drop.classList.add('over');
});
drop.addEventListener('dragleave', () => drop.classList.remove('over'));
drop.addEventListener('drop', (e) => {
  e.preventDefault();
  drop.classList.remove('over');
  const f = e.dataTransfer?.files[0];
  if (f) void verify(f);
});
input.addEventListener('change', () => {
  const f = input.files?.[0];
  if (f) void verify(f);
});
