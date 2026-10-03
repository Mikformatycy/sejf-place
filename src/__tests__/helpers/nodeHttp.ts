import { request } from 'node:https';

import type { PostBinary } from '@/integrity/rfc3161';

export function nodeGet(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    request(url, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    })
      .on('error', reject)
      .end();
  });
}

export const nodePost: PostBinary = (url, body, contentType, timeoutMs) =>
  new Promise((resolve, reject) => {
    const req = request(
      url,
      { method: 'POST', headers: { 'Content-Type': contentType, 'Content-Length': body.length }, timeout: timeoutMs },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve({ status: res.statusCode ?? 0, body: new Uint8Array(Buffer.concat(chunks)) }));
      },
    );
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
    req.end(Buffer.from(body));
  });
