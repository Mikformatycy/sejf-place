/**
 * @jest-environment node
 *
 * Live check against a real TSA. Skipped unless TSA_LIVE=1 (see `npm run tsa:smoke`).
 */
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { fromBase64, toHex } from '@/crypto/bytes';
import { nodeCryptoProvider } from '@/crypto/nodeProvider';
import { requestTimestamp } from '@/integrity/rfc3161';

import { nodeGet, nodePost } from './helpers/nodeHttp';
import { findOpenssl, openssl } from './helpers/openssl';

const live = process.env.TSA_LIVE === '1';
const TSA = process.env.TSA_URL ?? 'https://freetsa.org/tsr';

(live ? describe : describe.skip)(`live TSA ${TSA}`, () => {
  it('returns a token whose signature openssl accepts', async () => {
    const data = nodeCryptoProvider.randomBytes(64);
    const hash = await nodeCryptoProvider.sha256(data);
    const nonce = nodeCryptoProvider.randomBytes(8);
    const stamp = await requestTimestamp(TSA, hash, nonce, nodePost);

    console.log(`genTime=${stamp.genTime} serial=${stamp.serial} tsa="${stamp.tsaName}" policy=${stamp.policy}`);
    expect(Math.abs(Date.parse(stamp.genTime) - Date.now())).toBeLessThan(5 * 60_000);
    if (process.env.TSA_SAVE_FIXTURE === '1') {
      const fixture = { url: TSA, dataHex: toHex(data), hash: toHex(hash), nonce: toHex(nonce), stamp };
      writeFileSync(join(__dirname, 'fixtures', 'tsa-token.json'), JSON.stringify(fixture, null, 2));
    }

    const bin = findOpenssl();
    if (!bin || !TSA.includes('freetsa.org')) return;
    const dir = mkdtempSync(join(tmpdir(), 'tsa-'));
    writeFileSync(join(dir, 'token.der'), fromBase64(stamp.tokenB64));
    writeFileSync(join(dir, 'cacert.pem'), await nodeGet('https://freetsa.org/files/cacert.pem'));
    writeFileSync(join(dir, 'tsa.crt'), await nodeGet('https://freetsa.org/files/tsa.crt'));
    const out = openssl(bin, [
      'ts', '-verify', '-digest', toHex(hash), '-in', join(dir, 'token.der'), '-token_in',
      '-CAfile', join(dir, 'cacert.pem'), '-untrusted', join(dir, 'tsa.crt'),
    ]);
    expect(out).toMatch(/Verification: OK/);
  }, 60_000);
});
