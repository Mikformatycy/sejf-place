import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { unzipSync } from 'fflate';

import { nodeCryptoProvider } from '@/crypto/nodeProvider';
import { setCryptoProvider } from '@/crypto/provider';
import { verifyPackage } from '@/integrity/verify';

beforeAll(() => setCryptoProvider(nodeCryptoProvider));

// Packages built earlier (scripts/demo-package.mjs) with real FreeTSA tokens. They must keep
// verifying with the current code: old evidence has to stay checkable after every change.
function load(name: string): Map<string, Uint8Array> {
  const files = unzipSync(new Uint8Array(readFileSync(join(__dirname, '..', '..', 'verifier', 'demo', name))));
  return new Map(Object.entries(files));
}

describe('demo packages', () => {
  it('the original package verifies', async () => {
    const v = await verifyPackage(load('sejf-place-demo.zip'));
    expect(v.manifestError).toBeUndefined();
    expect(v.entries.length).toBeGreaterThan(0);
    expect(v.ok).toBe(true);
    expect(v.entries.every((e) => e.timestamp.verdict === 'ok')).toBe(true);
  });

  it('the package with one changed word fails', async () => {
    const v = await verifyPackage(load('sejf-place-demo-zmieniony.zip'));
    expect(v.ok).toBe(false);
  });
});
