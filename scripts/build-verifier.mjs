// Bundles verifier/src/main.ts (which reuses the app's integrity code) into verifier/verify.js.
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { build } from 'esbuild';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

await build({
  entryPoints: [join(root, 'verifier', 'src', 'main.ts')],
  outfile: join(root, 'verifier', 'verify.js'),
  bundle: true,
  format: 'iife',
  target: 'es2022',
  minify: true,
  alias: { '@': join(root, 'src') },
  logLevel: 'info',
});
