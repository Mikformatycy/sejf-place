/**
 * CMS signature check of RFC 3161 tokens (used by the browser verifier and tests;
 * not bundled into the app). Equivalent to `openssl ts -verify`.
 */
import * as pkijs from 'pkijs';

import { fromBase64 } from '@/crypto/bytes';

export interface SignatureVerdict {
  /** The TSA's signature over the token content is mathematically valid. */
  signatureValid: boolean;
  /** Signer certificate chains to one of the trusted roots; null when no roots were given. */
  chainTrusted: boolean | null;
  signer: string;
  message?: string;
}

const buf = (b: Uint8Array) => b.slice().buffer as ArrayBuffer;

export function pemToDer(pem: string): Uint8Array[] {
  return [...pem.matchAll(/-----BEGIN CERTIFICATE-----([\s\S]+?)-----END CERTIFICATE-----/g)].map((m) => fromBase64(m[1]));
}

function commonName(cert: pkijs.Certificate | null | undefined): string {
  const cn = cert?.subject.typesAndValues.find((t) => t.type === '2.5.4.3');
  return cn ? String(cn.value.valueBlock.value) : '';
}

/** `data` = the exact bytes that were hashed (pkijs re-checks the imprint as part of verification). */
export async function verifyTokenSignature(
  token: Uint8Array,
  data: Uint8Array,
  trustedRootsPem: string[] = [],
): Promise<SignatureVerdict> {
  let signedData: pkijs.SignedData;
  try {
    const contentInfo = pkijs.ContentInfo.fromBER(buf(token));
    signedData = new pkijs.SignedData({ schema: contentInfo.content });
  } catch (e) {
    return { signatureValid: false, chainTrusted: null, signer: '', message: `Nie da się odczytać tokenu: ${String(e)}` };
  }

  let signatureValid = false;
  let signer = '';
  try {
    const r = await signedData.verify({ signer: 0, data: buf(data), extendedMode: true, checkChain: false });
    signatureValid = !!r.signatureVerified;
    signer = commonName(r.signerCertificate);
  } catch (e) {
    const err = e as { message?: string; signerCertificate?: pkijs.Certificate };
    return { signatureValid: false, chainTrusted: null, signer: commonName(err.signerCertificate), message: err.message ?? String(e) };
  }

  const roots = trustedRootsPem.flatMap(pemToDer).map((d) => pkijs.Certificate.fromBER(buf(d)));
  if (roots.length === 0) return { signatureValid, chainTrusted: null, signer };
  try {
    const r = await signedData.verify({ signer: 0, data: buf(data), extendedMode: true, checkChain: true, trustedCerts: roots });
    return { signatureValid, chainTrusted: !!r.signerCertificateVerified, signer };
  } catch (e) {
    return { signatureValid, chainTrusted: false, signer, message: (e as { message?: string }).message ?? String(e) };
  }
}
