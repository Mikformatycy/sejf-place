/** @jest-environment node */
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { fromBase64, fromHex, toHex } from '@/crypto/bytes';
import { FREETSA_CACERT_PEM } from '@/content/tsaCerts';
import { buildTimeStampReq, checkTimestamp, parseToken } from '@/integrity/rfc3161';
import { verifyTokenSignature } from '@/integrity/signature';

import { findOpenssl, openssl } from './helpers/openssl';

const bin = findOpenssl();
const maybe = bin ? it : it.skip;

describe('TimeStampReq encoding', () => {
  const hash = fromHex('9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08');

  it('starts with a DER SEQUENCE and embeds the hash', () => {
    const der = buildTimeStampReq(hash, fromHex('0102030405060708'));
    expect(der[0]).toBe(0x30);
    expect(toHex(der)).toContain(toHex(hash));
  });

  it('encodes a nonce with the high bit set as a positive INTEGER', () => {
    const der = toHex(buildTimeStampReq(hash, fromHex('ff00000000000001')));
    expect(der).toContain('020900ff00000000000001');
  });

  maybe('is accepted by openssl ts -query', () => {
    const dir = mkdtempSync(join(tmpdir(), 'tsq-'));
    const file = join(dir, 'req.tsq');
    writeFileSync(file, buildTimeStampReq(hash, fromHex('1122334455667788')));
    const text = openssl(bin!, ['ts', '-query', '-in', file, '-text']);
    expect(text).toMatch(/Hash Algorithm: sha256/);
    // openssl prints "0000 - 9f 86 d0 ...   ascii"; keep only the hex columns.
    const dumped = text
      .split('\n')
      .filter((l) => /^\s*[0-9a-f]{4} - /.test(l))
      .map((l) => l.replace(/^\s*[0-9a-f]{4} - /, '').split('   ')[0].replace(/[\s-]/g, ''))
      .join('');
    expect(dumped).toBe(toHex(hash));
    expect(text).toMatch(/Nonce: 0x1122334455667788/i);
    expect(text).toMatch(/Certificate required: yes/);
  });
});

describe('TimeStampToken parsing (real FreeTSA token)', () => {
  // Captured with `TSA_LIVE=1 TSA_SAVE_FIXTURE=1 npx jest tsa.live` on 2026-10-03.
  const fixture = require('./fixtures/tsa-token.json');

  it('extracts the imprint, nonce, time and TSA name', () => {
    const parsed = parseToken(fromBase64(fixture.stamp.tokenB64));
    expect(toHex(parsed.imprint)).toBe(fixture.hash);
    expect(toHex(parsed.nonce!)).toBe(fixture.nonce.replace(/^(00)+/, ''));
    expect(parsed.genTime.toISOString()).toBe(fixture.stamp.genTime);
    expect(parsed.tsaName).toContain('freetsa.org');
  });

  it('rejects a token issued for a different hash', () => {
    const parsed = { status: 0, token: new Uint8Array(), ...parseToken(fromBase64(fixture.stamp.tokenB64)) };
    const other = fromHex('00'.repeat(32));
    expect(() => checkTimestamp(parsed, other, fromHex(fixture.nonce))).toThrow(/different hash/);
    expect(() => checkTimestamp(parsed, fromHex(fixture.hash), fromHex('0102030405060708'))).toThrow(/Nonce/);
    expect(() => checkTimestamp(parsed, fromHex(fixture.hash), fromHex(fixture.nonce))).not.toThrow();
  });
});

describe('TimeStampToken signature (CMS, like openssl ts -verify)', () => {
  const fixture = require('./fixtures/tsa-token.json');

  it('accepts the real FreeTSA token and chains it to the bundled FreeTSA root', async () => {
    const v = await verifyTokenSignature(fromBase64(fixture.stamp.tokenB64), fromHex(fixture.dataHex), [FREETSA_CACERT_PEM]);
    expect(v.signatureValid).toBe(true);
    expect(v.chainTrusted).toBe(true);
    expect(v.signer).toContain('freetsa.org');
  });

  it('rejects a token with a flipped byte in the signed content', async () => {
    const token = fromBase64(fixture.stamp.tokenB64);
    // Flip a byte inside the TSTInfo genTime region (well inside the encapsulated content).
    const idx = Buffer.from(token).indexOf(Buffer.from('2026'));
    token[idx + 3] ^= 1;
    const v = await verifyTokenSignature(token, fromHex(fixture.dataHex), [FREETSA_CACERT_PEM]);
    expect(v.signatureValid).toBe(false);
  });

  it('rejects the token for different data', async () => {
    const v = await verifyTokenSignature(fromBase64(fixture.stamp.tokenB64), fromHex('00ff'), [FREETSA_CACERT_PEM]);
    expect(v.signatureValid).toBe(false);
  });
});
