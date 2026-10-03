import { fromHex } from '@/crypto/bytes';
import { cryptoProvider } from '@/crypto/provider';
import type { Entry, TsaStamp } from '@/vault/types';

import { requestTimestamp, type PostBinary } from './rfc3161';

/** Tries each TSA in order and returns the first valid stamp. */
export async function stampHash(hashHex: string, urls: string[], post: PostBinary, timeoutMs?: number): Promise<TsaStamp> {
  let lastError: unknown = new Error('No TSA configured');
  for (const url of urls) {
    try {
      return await requestTimestamp(url, fromHex(hashHex), cryptoProvider().randomBytes(8), post, timeoutMs);
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;
}

/**
 * Stamps every entry that has no token yet. Runs only while the vault is open
 * (never in the background), so network traffic does not happen behind the user's back.
 * When every TSA fails for one entry (usually: no internet) the rest are not tried,
 * so an offline phone does not wait a timeout per entry.
 */
export async function stampPending(
  entries: Entry[],
  urls: string[],
  post: PostBinary,
  timeoutMs?: number,
): Promise<{ stamped: number; failed: number }> {
  let stamped = 0;
  const pending = entries.filter((e) => !e.tsa);
  for (const entry of pending) {
    try {
      entry.tsa = await stampHash(entry.hash, urls, post, timeoutMs);
      stamped++;
    } catch {
      break;
    }
  }
  return { stamped, failed: pending.length - stamped };
}
