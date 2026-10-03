// Requests a real timestamp from the configured TSA and verifies it with openssl.
// Usage: npm run tsa:smoke            (FreeTSA)
//        TSA_URL=https://timestamp.sectigo.com npm run tsa:smoke
import { spawnSync } from 'node:child_process';

const result = spawnSync('npx', ['jest', 'src/__tests__/tsa.live.test.ts', '--verbose'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, TSA_LIVE: '1' },
});
process.exit(result.status ?? 1);
