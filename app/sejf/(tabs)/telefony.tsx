import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { CONTACTS } from '@/content/pomoc';
import { CaptureButtons } from '@/ui/CaptureButtons';
import { C, Icon, VaultScreen } from '@/ui/kit';
import { themed } from '@/ui/theme';

export default function Phones() {
  return (
    <VaultScreen title="Telefony" back={false} tabbed overlay={<CaptureButtons />}>
      {CONTACTS.map((c) => {
        const urgent = c.dial === '112';
        return (
          <Pressable
            key={c.dial}
            accessibilityRole="button"
            accessibilityLabel={`Zadzwoń: ${c.name}`}
            onPress={() => void Linking.openURL(`tel:${c.dial}`)}
            style={({ pressed }) => [st.call, urgent && st.urgent, pressed && { opacity: 0.8 }]}
          >
            <View style={[st.icon, { backgroundColor: urgent ? C.accent : C.primary }]}>
              <Icon name="call" size={18} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.name}>{c.short}</Text>
            </View>
            <Text style={[st.phone, urgent && { color: C.accent }]}>{c.phone}</Text>
          </Pressable>
        );
      })}

    </VaultScreen>
  );
}

const st = themed(() => StyleSheet.create({
  call: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
  },
  urgent: { borderColor: C.accent, borderWidth: 1.5 },
  icon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 15, fontWeight: '700', color: C.text },
  phone: { fontSize: 17, fontWeight: '800', color: C.primary },
}));
