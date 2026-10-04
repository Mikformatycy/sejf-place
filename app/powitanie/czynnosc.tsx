import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { CoverId } from '@/covers/canonical';
import { ActionPicker, KEY_IOS_NOTE } from '@/screens/CoverPicker';
import { C, P } from '@/ui/kit';

export default function PickAction() {
  const { cover } = useLocalSearchParams<{ cover: CoverId }>();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={{ fontSize: 26, fontWeight: '800', color: C.text, marginBottom: 6 }}>Klucz</Text>
        <P muted>Ta czynność otworzy sejf.{KEY_IOS_NOTE}</P>
        <View style={{ height: 16 }} />
        <ActionPicker coverId={cover} onPick={(action) => router.push({ pathname: '/powitanie/nagraj', params: { cover, action } })} />
      </ScrollView>
    </SafeAreaView>
  );
}
