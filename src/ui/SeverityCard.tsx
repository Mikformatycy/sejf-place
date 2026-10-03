import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import type { Assessment } from '@/legal/assessment';

import { C, Icon, Info, type IconName } from './kit';
import { themed } from './theme';

// Orange to deep red: the frame shows how serious it is at a glance.
const LOOK: Record<1 | 2 | 3, { icon: IconName; color: string }> = {
  1: { icon: 'alert-circle-outline', color: '#E08A2E' },
  2: { icon: 'warning-outline', color: '#D9452B' },
  3: { icon: 'alert-circle', color: '#A3161A' },
};

/** The AI's opinion of one entry; at the highest level a quiet link to the helplines. */
export function SeverityCard({ a }: { a: Assessment }) {
  const look = LOOK[a.level];
  return (
    <View style={[st.card, { borderColor: look.color }]}>
      <View style={st.head}>
        <Icon name={look.icon} size={22} color={look.color} />
        <Text style={st.title}>{a.title}</Text>
        {a.explanation ? <Info text={a.explanation} /> : null}
      </View>
      {a.message ? <Text style={st.message}>{a.message}</Text> : null}
      {a.level === 3 ? (
        <Text style={[st.link, { color: look.color }]} onPress={() => router.push('/sejf/telefony')}>
          Telefony pomocowe ›
        </Text>
      ) : null}
    </View>
  );
}

const st = themed(() => StyleSheet.create({
  card: { backgroundColor: C.surface, borderRadius: 10, borderWidth: 2, padding: 14, marginBottom: 14 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { flex: 1, fontSize: 16, fontWeight: '700', color: C.text },
  message: { fontSize: 15, lineHeight: 21, marginTop: 6, color: C.muted },
  link: { fontSize: 14, fontWeight: '600', marginTop: 10 },
}));
