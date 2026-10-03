import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { legalHints, toHintEntry, type Hint } from '@/legal/hints';
import { C, List, VaultScreen } from '@/ui/kit';
import { themed } from '@/ui/theme';
import { useSession } from '@/vault/session';

/** Offline: which verified provisions may relate to one saved entry. Nothing leaves the phone. */
export default function LegalScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const index = useSession((s) => s.index);

  const hints = useMemo(() => {
    const content = index?.entries.find((e) => e.id === id)?.content;
    if (!index || !content) return [];
    const history = index.entries.filter((e) => e.content && e.id !== id).map((e) => toHintEntry(e.content!));
    return legalHints({ entry: toHintEntry(content), history, profile: index.profile });
  }, [index, id]);

  return (
    <VaultScreen title="Co mówi prawo">
      {hints.length === 0 ? (
        <Text style={st.muted}>Nic nie pasuje do tego opisu.</Text>
      ) : (
        <List>
          {hints.map((h, i) => (
            <HintRow key={h.id} hint={h} last={i === hints.length - 1} />
          ))}
        </List>
      )}
      <Text style={[st.muted, st.center]}>To nie porada prawna.</Text>
    </VaultScreen>
  );
}

/** Title only; a tap shows two lines: what it means and which provision. */
function HintRow({ hint, last }: { hint: Hint; last: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      onPress={() => setOpen((v) => !v)}
      style={({ pressed }) => [st.row, !last && st.divider, pressed && { backgroundColor: C.bg }]}
    >
      <Text style={[st.title, open && { fontWeight: '600' }]}>{hint.title}</Text>
      {open ? (
        <View style={{ marginTop: 6 }}>
          <Text style={st.summary}>{hint.summary}</Text>
          <Text style={st.law}>{hint.law}</Text>
          {hint.helpSlug ? (
            <Text style={st.more} onPress={() => router.push({ pathname: '/sejf/pomoc/[slug]', params: { slug: hint.helpSlug! } })}>
              Więcej
            </Text>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

const st = themed(() => StyleSheet.create({
  row: { paddingHorizontal: 14, paddingVertical: 14 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  title: { fontSize: 16, color: C.text },
  summary: { fontSize: 15, color: C.muted, lineHeight: 21 },
  law: { fontSize: 12, color: C.muted, marginTop: 6 },
  more: { fontSize: 14, color: C.primary, fontWeight: '600', marginTop: 8 },
  muted: { fontSize: 14, color: C.muted, marginBottom: 12 },
  center: { textAlign: 'center', marginTop: 8 },
}));
