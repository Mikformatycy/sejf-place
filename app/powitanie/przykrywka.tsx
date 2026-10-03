import { router } from 'expo-router';
import { Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CoverPicker } from '@/screens/CoverPicker';
import { C, P } from '@/ui/kit';

export default function PickCover() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={{ fontSize: 26, fontWeight: '800', color: C.text, marginBottom: 6 }}>Przykrywka</Text>
        {Platform.OS === 'ios' ? <P muted>Na iPhonie zmieni się tylko ikona.</P> : null}
        <View style={{ height: 16 }} />
        <CoverPicker onPick={(id) => router.push({ pathname: '/powitanie/czynnosc', params: { cover: id } })} />
      </ScrollView>
    </SafeAreaView>
  );
}
