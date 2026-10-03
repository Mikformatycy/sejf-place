import { requireOptionalNativeModule } from 'expo';

interface CoverSwitcherNative {
  setCover(id: string): Promise<boolean>;
  getCover(): string | null;
}

// Null in Expo Go: the launcher icon can only be changed in a development/production build.
const native = requireOptionalNativeModule<CoverSwitcherNative>('CoverSwitcher');

export const coverSwitcherAvailable = native !== null;

export async function setLauncherCover(id: string): Promise<boolean> {
  if (!native) return false;
  try {
    return await native.setCover(id);
  } catch {
    return false;
  }
}

export function getLauncherCover(): string | null {
  return native?.getCover() ?? null;
}
