import { mp4DurationMs } from '@/vault/mp4';

/** Minimal moov/mvhd box with the given timescale and duration. */
function mvhd(version: 0 | 1, timescale: number, duration: number): Uint8Array {
  const size = version === 1 ? 120 : 108;
  const b = new Uint8Array(16 + size);
  const v = new DataView(b.buffer);
  b.set([0x6d, 0x6f, 0x6f, 0x76], 4); // 'moov' (size left 0, not read)
  v.setUint32(8, size);
  b.set([0x6d, 0x76, 0x68, 0x64], 12); // 'mvhd'
  b[16] = version;
  if (version === 1) {
    v.setUint32(16 + 20, timescale);
    v.setUint32(16 + 24, Math.floor(duration / 2 ** 32));
    v.setUint32(16 + 28, duration % 2 ** 32);
  } else {
    v.setUint32(16 + 12, timescale);
    v.setUint32(16 + 16, duration);
  }
  return b;
}

describe('mp4DurationMs', () => {
  it('reads version 0 boxes', () => expect(mp4DurationMs(mvhd(0, 44100, 44100 * 83))).toBe(83_000));
  it('reads version 1 boxes', () => expect(mp4DurationMs(mvhd(1, 1000, 5_400))).toBe(5_400));
  it('returns null without mvhd', () => expect(mp4DurationMs(new Uint8Array(64))).toBeNull());
});
