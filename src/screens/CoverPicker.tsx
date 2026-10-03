import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import type { CoverId } from '@/covers/canonical';
import { COVERS, coverInfo } from '@/covers/catalog';
import { C, List } from '@/ui/kit';
import { themed } from '@/ui/theme';

const ICONS: Record<CoverId, number> = {
  przepisy: require('../../assets/covers/przepisy.png'),
  zadania: require('../../assets/covers/zadania.png'),
  woda: require('../../assets/covers/woda.png'),
  urodziny: require('../../assets/covers/urodziny.png'),
  ksiazki: require('../../assets/covers/ksiazki.png'),
  kwiatki: require('../../assets/covers/kwiatki.png'),
};

/** Icon grid, like a home screen: the user picks what the app will look like. */
export function CoverPicker({ current, onPick }: { current?: CoverId; onPick: (id: CoverId) => void }) {
  return (
    <View style={st.grid}>
      {COVERS.map((c) => (
        <Pressable
          key={c.id}
          accessibilityRole="button"
          onPress={() => onPick(c.id)}
          style={({ pressed }) => [st.tile, current === c.id && st.current, pressed && { opacity: 0.6 }]}
        >
          <Image source={ICONS[c.id]} style={st.icon} />
          <Text style={st.label} numberOfLines={1}>
            {c.label}
          </Text>
          {current === c.id ? <Text style={st.currentText}>obecna</Text> : null}
        </Pressable>
      ))}
    </View>
  );
}

/** Plain list: the user picks which action in the cover opens the vault. */
export function ActionPicker({ coverId, onPick }: { coverId: CoverId; onPick: (actionId: string) => void }) {
  const actions = coverInfo(coverId).actions;
  return (
    <List>
      {actions.map((a, i) => (
        <Pressable
          key={a.id}
          accessibilityRole="button"
          accessibilityLabel={`${a.title}, ${a.example}`}
          onPress={() => onPick(a.id)}
          style={({ pressed }) => [st.action, i < actions.length - 1 && st.divider, pressed && { backgroundColor: C.bg }]}
        >
          <Text style={st.actionTitle}>{a.title}</Text>
        </Pressable>
      ))}
    </List>
  );
}

/** On iPhone the keyboard may remember a typed phrase, so a number key is safer. */
export const KEY_IOS_NOTE = Platform.OS === 'ios' ? ' Na iPhonie wybierz klucz z liczbą: klawiatura może zapamiętać wpisaną frazę.' : '';

const st = themed(() => StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
  tile: { width: '33.33%', alignItems: 'center', paddingVertical: 14, borderRadius: 8, borderWidth: 2, borderColor: 'transparent' },
  current: { borderColor: C.primary },
  icon: { width: 64, height: 64, borderRadius: 14 },
  label: { fontSize: 14, color: C.text, marginTop: 8 },
  currentText: { fontSize: 12, color: C.primary },
  action: { justifyContent: 'center', paddingHorizontal: 14, minHeight: 52 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  actionTitle: { fontSize: 16, color: C.text },
}));
