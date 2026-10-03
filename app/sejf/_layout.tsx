import { Redirect, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import { C } from '@/ui/kit';
import { applyTheme } from '@/ui/theme';
import { UnlockIntro } from '@/ui/UnlockIntro';
import { stampNow } from '@/vault/actions';
import { useVaultGuards } from '@/vault/quickExit';
import { useSession } from '@/vault/session';

export default function VaultLayout() {
  const unlocked = useSession((s) => s.unlocked);
  // This layout mounts once per opening of the vault, so the intro plays once after the key.
  const [intro, setIntro] = useState(true);
  const endIntro = useCallback(() => setIntro(false), []);
  const settings = useSession((s) => s.index?.settings);
  const { touch } = useVaultGuards({
    shakeToExit: settings?.shakeToExit ?? true,
    autoLockMinutes: settings?.autoLockMinutes ?? 2,
  });

  // Fetch missing timestamps whenever the vault is opened (never in the background).
  useEffect(() => {
    if (unlocked) void stampNow();
  }, [unlocked]);

  // Leaving the vault in any way (e.g. back from its first screen) locks it; the cover is always light.
  useEffect(
    () => () => {
      applyTheme(false);
      useSession.getState().lock();
    },
    [],
  );

  // Set before the screens render, so they pick up the colours on this pass.
  const dark = unlocked && !!settings?.darkMode;
  applyTheme(dark);

  if (!unlocked) return <Redirect href="/" />;

  return (
    <View style={{ flex: 1 }} onTouchStart={touch}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      {/* A new key re-creates the screens with the other colours. */}
      <Stack key={dark ? 'dark' : 'light'} screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: C.bg } }} />
      {intro ? <UnlockIntro onDone={endIntro} /> : null}
    </View>
  );
}
