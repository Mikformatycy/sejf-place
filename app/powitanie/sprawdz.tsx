import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { CoverId } from '@/covers/canonical';
import { CoverHost } from '@/screens/CoverHost';
import { C } from '@/ui/kit';
import { themed } from '@/ui/theme';

/** Final onboarding step: the real cover, unlocked the real way. */
export default function TestKey() {
  const { cover } = useLocalSearchParams<{ cover: CoverId }>();
  const [busy, setBusy] = useState(false);
  return (
    <View style={{ flex: 1 }}>
      <SafeAreaView edges={['top']} style={st.banner}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={st.title}>Sprawdź klucz</Text>
          <Pressable onPress={() => router.replace('/')} hitSlop={10}>
            <Text style={st.skip}>Pomiń</Text>
          </Pressable>
        </View>
        <Text style={st.text}>Wykonaj swoją czynność.</Text>
      </SafeAreaView>
      <View style={{ flex: 1 }}>
        <CoverHost coverId={cover} onBusy={setBusy} onUnlocked={() => router.replace('/sejf')} />
        {busy ? (
          <View style={st.overlay}>
            <ActivityIndicator size="large" color={C.primary} />
            <Text style={st.text}>Otwieram…</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const st = themed(() => StyleSheet.create({
  banner: { backgroundColor: '#FFFDF8', borderBottomWidth: 2, borderBottomColor: C.ok, paddingHorizontal: 14, paddingBottom: 10 },
  title: { flex: 1, fontSize: 15, fontWeight: '700', color: C.ok, paddingTop: 6 },
  text: { fontSize: 15, color: C.text, marginTop: 4, lineHeight: 21 },
  skip: { color: C.muted, fontSize: 15, paddingTop: 6 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.85)', alignItems: 'center', justifyContent: 'center' },
}));
