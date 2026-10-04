// Builds verifier/demo/sejf-place-demo.zip (+ a tampered copy) with real FreeTSA timestamps.
// Usage: npm run demo:package
import { spawnSync } from 'node:child_process';

const result = spawnSync('npx', ['jest', 'src/__tests__/demoPackage.live.test.ts'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, DEMO_OUT: 'verifier/demo/sejf-place-demo.zip' },
});
process.exit(result.status ?? 1);
