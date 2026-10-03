/**
 * Length of an MP4/M4A file read from its "mvhd" box (no player needed).
 * Returns null when the box is missing or malformed.
 */
export function mp4DurationMs(bytes: Uint8Array): number | null {
  // 'm' 'v' 'h' 'd'
  for (let i = 4; i + 4 <= bytes.length; i++) {
    if (bytes[i] !== 0x6d || bytes[i + 1] !== 0x76 || bytes[i + 2] !== 0x68 || bytes[i + 3] !== 0x64) continue;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const body = i + 4;
    const version = bytes[body];
    // version 0: 32-bit times, version 1: 64-bit times.
    const tsAt = body + (version === 1 ? 20 : 12);
    if (tsAt + (version === 1 ? 12 : 8) > bytes.length) return null;
    const timescale = view.getUint32(tsAt);
    const duration = version === 1 ? view.getUint32(tsAt + 4) * 2 ** 32 + view.getUint32(tsAt + 8) : view.getUint32(tsAt + 4);
    if (!timescale) return null;
    return Math.round((duration / timescale) * 1000);
  }
  return null;
}
