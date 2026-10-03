/**
 * Minimal RFC 3161 (Time-Stamp Protocol) client.
 *
 * Only the SHA-256 hash leaves the device. The response token is stored as-is,
 * so its CMS signature can be verified later with standard tools, e.g.
 *   openssl ts -verify -digest <hex> -in token.tsr -token_in -CAfile cacert.pem -untrusted tsa.crt
 */
import * as asn1js from 'asn1js';

import { concatBytes, equalBytes, toBase64, toHex } from '@/crypto/bytes';
import type { TsaStamp } from '@/vault/types';

const OID_SHA256 = '2.16.840.1.101.3.4.2.1';
const OID_SIGNED_DATA = '1.2.840.113549.1.7.2';
const OID_TST_INFO = '1.2.840.113549.1.9.16.1.4';
const OID_CN = '2.5.4.3';
const OID_O = '2.5.4.10';

// ---------- DER encoding of TimeStampReq ----------

function derLength(n: number): Uint8Array {
  if (n < 0x80) return Uint8Array.of(n);
  const bytes: number[] = [];
  for (let v = n; v > 0; v >>= 8) bytes.unshift(v & 0xff);
  return Uint8Array.of(0x80 | bytes.length, ...bytes);
}

function tlv(tag: number, content: Uint8Array): Uint8Array {
  return concatBytes(Uint8Array.of(tag), derLength(content.length), content);
}

function derInteger(unsigned: Uint8Array): Uint8Array {
  let i = 0;
  while (i < unsigned.length - 1 && unsigned[i] === 0) i++;
  let body: Uint8Array = unsigned.slice(i);
  if (body[0] & 0x80) body = concatBytes(Uint8Array.of(0), body);
  return tlv(0x02, body);
}

const SHA256_ALG_ID = tlv(
  0x30,
  concatBytes(Uint8Array.of(0x06, 0x09, 0x60, 0x86, 0x48, 0x01, 0x65, 0x03, 0x04, 0x02, 0x01), Uint8Array.of(0x05, 0x00)),
);

/**
 * TimeStampReq ::= SEQUENCE { version INTEGER (1), messageImprint MessageImprint,
 *   nonce INTEGER, certReq BOOLEAN TRUE }
 */
export function buildTimeStampReq(sha256: Uint8Array, nonce: Uint8Array): Uint8Array {
  if (sha256.length !== 32) throw new Error('Expected a SHA-256 digest');
  const messageImprint = tlv(0x30, concatBytes(SHA256_ALG_ID, tlv(0x04, sha256)));
  return tlv(
    0x30,
    concatBytes(derInteger(Uint8Array.of(1)), messageImprint, derInteger(nonce), Uint8Array.of(0x01, 0x01, 0xff)),
  );
}

// ---------- Parsing TimeStampResp ----------

export interface ParsedTimestamp {
  status: number;
  /** DER of the TimeStampToken (ContentInfo with SignedData). */
  token: Uint8Array;
  genTime: Date;
  serialHex: string;
  policy: string;
  imprintAlgorithm: string;
  imprint: Uint8Array;
  nonce: Uint8Array | null;
  tsaName: string;
}

export class TimestampError extends Error {}

type Block = asn1js.BaseBlock<asn1js.ValueBlock>;

function children(block: Block): Block[] {
  const v = (block.valueBlock as unknown as { value?: Block[] }).value;
  if (!Array.isArray(v)) throw new TimestampError('Unexpected ASN.1 structure');
  return v;
}

function decode(bytes: Uint8Array): Block {
  const asn = asn1js.fromBER(bytes);
  if (asn.offset === -1) throw new TimestampError('Malformed ASN.1');
  return asn.result as Block;
}

function isContext(block: Block, n: number): boolean {
  return block.idBlock.tagClass === 3 && block.idBlock.tagNumber === n;
}

function octets(block: Block): Uint8Array {
  const vb = block.valueBlock as unknown as { isConstructed?: boolean; value?: Block[]; valueHexView: Uint8Array };
  if (vb.isConstructed && vb.value) return concatBytes(...vb.value.map(octets));
  return new Uint8Array(vb.valueHexView);
}

function integerBytes(block: Block): Uint8Array {
  const view = (block.valueBlock as unknown as { valueHexView: Uint8Array }).valueHexView;
  let i = 0;
  while (i < view.length - 1 && view[i] === 0) i++;
  return new Uint8Array(view.slice(i));
}

function oid(block: Block): string {
  return (block as unknown as asn1js.ObjectIdentifier).getValue();
}

/** Collects CN / O attributes from a GeneralName, e.g. "CN=www.freetsa.org, O=Free TSA". */
function readName(block: Block): string {
  const parts: string[] = [];
  const walk = (b: Block | undefined) => {
    const kids = (b?.valueBlock as unknown as { value?: unknown } | undefined)?.value;
    if (!Array.isArray(kids)) return;
    for (let i = 0; i < kids.length; i++) {
      const k = kids[i] as Block;
      const next = kids[i + 1] as { getValue?: () => unknown } | undefined;
      if (k instanceof asn1js.ObjectIdentifier && typeof next?.getValue === 'function') {
        const id = k.getValue();
        const val = next.getValue();
        if ((id === OID_CN || id === OID_O) && typeof val === 'string') parts.push(`${id === OID_CN ? 'CN' : 'O'}=${val}`);
      }
      walk(k);
    }
  };
  walk(block);
  return parts.join(', ');
}

/** Extracts the TSTInfo from a TimeStampToken (ContentInfo). */
export function parseToken(token: Uint8Array): Omit<ParsedTimestamp, 'status' | 'token'> {
  const contentInfo = children(decode(token));
  if (oid(contentInfo[0]) !== OID_SIGNED_DATA) throw new TimestampError('Token is not CMS SignedData');
  const signedData = children(children(contentInfo[1])[0]);
  const encap = children(signedData[2]);
  if (oid(encap[0]) !== OID_TST_INFO) throw new TimestampError('Token does not carry TSTInfo');
  const tstInfo = children(decode(octets(children(encap[1])[0])));

  const [, policy, messageImprint, serial, genTime, ...rest] = tstInfo;
  const mi = children(messageImprint);
  let nonce: Uint8Array | null = null;
  let tsaName = '';
  for (const b of rest) {
    if (b instanceof asn1js.Integer) nonce = integerBytes(b);
    else if (isContext(b, 0)) tsaName = readName(b);
  }
  return {
    genTime: (genTime as unknown as asn1js.GeneralizedTime).toDate(),
    serialHex: toHex(integerBytes(serial)),
    policy: oid(policy),
    imprintAlgorithm: oid(children(mi[0])[0]),
    imprint: octets(mi[1]),
    nonce,
    tsaName,
  };
}

export function parseTimeStampResp(der: Uint8Array): ParsedTimestamp {
  const resp = children(decode(der));
  const statusInfo = children(resp[0]);
  const status = (statusInfo[0].valueBlock as unknown as { valueDec: number }).valueDec;
  if ((status !== 0 && status !== 1) || !resp[1]) {
    throw new TimestampError(`TSA refused the request (PKIStatus ${status})`);
  }
  const token = new Uint8Array(resp[1].valueBeforeDecodeView);
  return { status, token, ...parseToken(token) };
}

/** Checks that the token is for our hash and our nonce. Signature is verified off-device. */
export function checkTimestamp(parsed: ParsedTimestamp, sha256: Uint8Array, nonce: Uint8Array): void {
  if (parsed.imprintAlgorithm !== OID_SHA256) throw new TimestampError('TSA used a different hash algorithm');
  if (!equalBytes(parsed.imprint, sha256)) throw new TimestampError('Token is for a different hash');
  if (!parsed.nonce || !equalBytes(parsed.nonce, integerBytes(decode(derInteger(nonce))))) {
    throw new TimestampError('Nonce mismatch');
  }
}

// ---------- Network ----------

export interface HttpResponse {
  status: number;
  body: Uint8Array;
}

export type PostBinary = (url: string, body: Uint8Array, contentType: string, timeoutMs: number) => Promise<HttpResponse>;

export async function requestTimestamp(
  url: string,
  sha256: Uint8Array,
  nonce: Uint8Array,
  post: PostBinary,
  timeoutMs = 20000,
): Promise<TsaStamp> {
  const res = await post(url, buildTimeStampReq(sha256, nonce), 'application/timestamp-query', timeoutMs);
  if (res.status !== 200) throw new TimestampError(`TSA HTTP ${res.status}`);
  const parsed = parseTimeStampResp(res.body);
  checkTimestamp(parsed, sha256, nonce);
  return {
    url,
    genTime: parsed.genTime.toISOString(),
    serial: parsed.serialHex,
    policy: parsed.policy,
    // React Native's URL polyfill lacks `host`, so extract it by hand.
    tsaName: parsed.tsaName || (/^[a-z]+:\/\/([^/:]+)/i.exec(url)?.[1] ?? url),
    tokenB64: toBase64(parsed.token),
  };
}
