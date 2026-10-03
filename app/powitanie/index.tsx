import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { beginFirstRun } from '@/screens/setupFlow';
import { Btn, C, Icon, OutlineText, P, type IconName } from '@/ui/kit';
import { themed } from '@/ui/theme';
import { keyManager } from '@/vault/session';

export default function Welcome() {
  const [allowed] = useState(() => beginFirstRun(keyManager.isInitialized()));
  if (!allowed) return <Redirect href="/" />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={st.content}>
        <View style={{ marginBottom: 10 }}>
          <OutlineText text="sejf-place" size={34} fill={C.bg} />
        </View>
        <P muted>Dowody ukryte w zwykłej aplikacji.</P>

        <View style={st.steps}>
          <Step icon="apps-outline" text="Przykrywka" />
          <Step icon="key-outline" text="Klucz" />
          <Step icon="lock-closed-outline" text="Szyfrowanie" />
        </View>

        <Text style={st.warn}>Klucza nie da się odzyskać.</Text>
        <Btn label="Dalej" onPress={() => router.push('/powitanie/przykrywka')} />
        <P muted style={{ marginTop: 12, textAlign: 'center' }}>
          Zagrożenie: 112
        </P>
      </ScrollView>
    </SafeAreaView>
  );
}

function Step({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={st.step}>
      <View style={st.stepIcon}>
        <Icon name={icon} size={26} color={C.primary} />
      </View>
      <Text style={st.stepText}>{text}</Text>
    </View>
  );
}

const st = themed(() => StyleSheet.create({
  content: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 32, fontWeight: '800', color: C.text, marginBottom: 10 },
  steps: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 32 },
  step: { alignItems: 'center', gap: 8 },
  stepIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' },
  stepText: { fontSize: 14, color: C.text },
  warn: { fontSize: 14, color: C.warn, marginBottom: 12 },
}));
