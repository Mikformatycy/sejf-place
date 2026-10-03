import { fetch } from 'expo/fetch';

import type { PostBinary } from './rfc3161';

/** Binary POST through Expo's native fetch (supports Uint8Array bodies and arrayBuffer()). */
export const expoPostBinary: PostBinary = async (url, body, contentType, timeoutMs) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': contentType },
      body: body as Uint8Array<ArrayBuffer>,
      signal: controller.signal,
    });
    return { status: res.status, body: new Uint8Array(await res.arrayBuffer()) };
  } finally {
    clearTimeout(timer);
  }
};
