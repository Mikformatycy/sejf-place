import { Lexend_600SemiBold, useFonts } from '@expo-google-fonts/lexend';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useSession } from '@/vault/session';

export default function RootLayout() {
  const booted = useSession((s) => s.booted);
  // The logotype's font; until it loads the name shows in the system font (nothing waits for it).
  useFonts({ Lexend_600SemiBold });

  useEffect(() => {
    void useSession.getState().boot();
  }, []);

  // Neutral blank screen while keys load (a few ms); never a branded splash.
  if (!booted) return <View style={{ flex: 1, backgroundColor: '#FBF6F0' }} />;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />
    </SafeAreaProvider>
  );
}
