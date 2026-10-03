import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Assessment } from '@/legal/assessment';

import { C, Icon, Info, type IconName } from './kit';
import { themed } from './theme';

// A function, so the colours follow the current theme.
const LOOK = (): Record<1 | 2 | 3, { icon: IconName; color: string }> => ({
  1: { icon: 'alert-circle-outline', color: C.warn },
  2: { icon: 'warning-outline', color: C.accent },
  3: { icon: 'alert-circle', color: C.danger },
});

const CALLS = [
  { label: 'Niebieska Linia', phone: '800 120 002', dial: '800120002' },
  { label: 'Alarmowy', phone: '112', dial: '112' },
];

/** Calm card: the level shows as a coloured stripe and icon; the details sit behind ⓘ. */
export function SeverityCard({ a }: { a: Assessment }) {
  const look = LOOK()[a.level];
  return (
    <View style={[st.card, { borderLeftColor: look.color }]}>
      <View style={st.head}>
        <Icon name={look.icon} size={24} color={look.color} />
        <Text style={st.title}>{a.title}</Text>
        {a.explanation ? <Info text={a.explanation} /> : null}
      </View>
      {a.message ? <Text style={st.message}>{a.message}</Text> : null}
      {a.level === 3 ? (
        <View style={st.calls}>
          {CALLS.map((c) => (
            <Pressable key={c.dial} onPress={() => void Linking.openURL(`tel:${c.dial}`)} style={st.call} accessibilityLabel={`Zadzwoń: ${c.label}`}>
              <Icon name="call" size={16} color="#fff" />
              <Text style={st.callText}>{c.phone}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const st = themed(() => StyleSheet.create({
  card: { backgroundColor: C.surface, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border, borderLeftWidth: 4, padding: 14, marginBottom: 14 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { flex: 1, fontSize: 16, fontWeight: '700', color: C.text },
  message: { fontSize: 15, lineHeight: 21, marginTop: 6, color: C.muted },
  calls: { flexDirection: 'row', gap: 10, marginTop: 12 },
  call: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: C.danger, borderRadius: 8, paddingVertical: 10 },
  callText: { color: '#fff', fontWeight: '700', fontSize: 16 },
}));
