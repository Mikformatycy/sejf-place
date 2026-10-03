import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const CANDIDATES = ['openssl', 'C:\\Program Files\\Git\\usr\\bin\\openssl.exe', 'C:\\Program Files\\Git\\mingw64\\bin\\openssl.exe'];

/** Path to an openssl binary, or null when none is installed. */
export function findOpenssl(): string | null {
  for (const bin of CANDIDATES) {
    if (bin.includes('\\') && !existsSync(bin)) continue;
    try {
      execFileSync(bin, ['version'], { stdio: 'pipe' });
      return bin;
    } catch {
      // try next candidate
    }
  }
  return null;
}

export function openssl(bin: string, args: string[]): string {
  return execFileSync(bin, args, { stdio: 'pipe' }).toString();
}
