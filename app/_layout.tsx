import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useSession } from '@/vault/session';

export default function RootLayout() {
  const booted = useSession((s) => s.booted);

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
