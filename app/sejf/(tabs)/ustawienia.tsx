import { router } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { coverSwitcherAvailable } from '../../../modules/cover-switcher';

import { useLatest } from '@/covers/ui/shared';
import { aiReady } from '@/ai/config';
import { ActionPicker, CoverPicker, KEY_IOS_NOTE } from '@/screens/CoverPicker';
import { Btn, C, H2, Icon, Info, List, Toggle, VaultScreen, type IconName } from '@/ui/kit';
import { themed } from '@/ui/theme';
import { wipeEverything } from '@/vault/actions';
import { markActivity } from '@/vault/quickExit';
import { useSession } from '@/vault/session';
import type { Profile, VaultIndex, VaultSettings } from '@/vault/types';

export default function Settings() {
  const index = useSession((st) => st.index);
  if (!index) return null;
  return <SettingsForm index={index} />;
}

const ICON_NOTE = !coverSwitcherAvailable
  ? 'W Expo Go ikona się nie zmienia.'
  : Platform.OS === 'ios'
    ? 'iPhone pokaże komunikat o zmianie ikony.'
    : 'Ikona i nazwa zmienią się po wyjściu z Teczki.';

function SettingsForm({ index }: { index: VaultIndex }) {
  const coverId = useSession((st) => st.coverId);
  const [profile, setProfile] = useState<Profile>(index.profile);
  const [settings, setSettings] = useState<VaultSettings>(index.settings);
  const [keyOpen, setKeyOpen] = useState(false);
  const [lockText, setLockText] = useState(String(index.settings.autoLockMinutes));

  const stored = useSession((st) => st.index);
  const dirty = JSON.stringify([profile, settings]) !== JSON.stringify([stored?.profile, stored?.settings]);

  const save = async (p: Profile, st: VaultSettings) => {
    try {
      await useSession.getState().update((idx) => {
        idx.profile = p;
        idx.settings = st;
      });
    } catch (e) {
      Alert.alert('Nie udało się zapisać', String(e));
    }
  };

  // Saved by itself shortly after a change, like the phone's own settings.
  useEffect(() => {
    if (!dirty) return;
    const timer = setTimeout(() => void save(profile, settings), 600);
    return () => clearTimeout(timer);
  }, [dirty, profile, settings]);

  // Leaving the screen keeps the changes (skipped after a quick exit).
  const latest = useLatest({ profile, settings, dirty });
  useEffect(
    () => () => {
      const { profile: p, settings: st, dirty: d } = latest.current;
      if (!d || !useSession.getState().unlocked) return;
      void useSession
        .getState()
        .update((idx) => {
          idx.profile = p;
          idx.settings = st;
        })
        .catch(() => undefined);
    },
    [latest],
  );

  // The theme switches right away: the screens are re-created with the new colours.
  const setDark = (v: boolean) => {
    const next = { ...settings, darkMode: v };
    setSettings(next);
    void save(profile, next);
  };

  const wipe = () =>
    Alert.alert('Usunąć wszystko?', 'Wpisy, zdjęcia, nagrania i klucz zostaną trwale usunięte.', [
      { text: 'Anuluj', style: 'cancel' },
      {
        text: 'Dalej',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Na pewno?', 'Bez kopii dowody przepadną.', [
            { text: 'Anuluj', style: 'cancel' },
            {
              text: 'Usuń wszystko',
              style: 'destructive',
              onPress: async () => {
                await wipeEverything();
                router.replace('/');
              },
            },
          ]),
      },
    ]);

  return (
    <VaultScreen title="Ustawienia" back={false} tabbed>
      <H2 info={`Wybranie innej przykrywki ustawia nowy klucz. ${ICON_NOTE}`}>Przykrywka</H2>
      <CoverPicker current={coverId} onPick={(id) => router.push({ pathname: '/sejf/klucz/czynnosc', params: { cover: id } })} />

      <H2 info={`Wybierz nową czynność i wykonaj ją. Stary klucz przestanie działać.${KEY_IOS_NOTE}`}>Klucz</H2>
      <List>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: keyOpen }}
          onPress={() => setKeyOpen((v) => !v)}
          style={({ pressed }) => [st.plainRow, pressed && { backgroundColor: C.bg }]}
        >
          <Text style={st.rowLabel}>Zmień klucz</Text>
        </Pressable>
      </List>
      {keyOpen ? (
        <ActionPicker coverId={coverId} onPick={(action) => router.push({ pathname: '/sejf/klucz/nagraj', params: { cover: coverId, action } })} />
      ) : null}

      <H2>Wygląd</H2>
      <List>
        <SettingRow icon="moon-outline" label="Tryb ciemny" last>
          <Toggle value={!!settings.darkMode} onChange={setDark} label="Tryb ciemny" />
        </SettingRow>
      </List>

      <H2>Bezpieczeństwo</H2>
      <List>
        <SettingRow icon="phone-portrait-outline" label="Wyjście potrząśnięciem">
          <Toggle value={settings.shakeToExit} onChange={(v) => setSettings({ ...settings, shakeToExit: v })} label="Wyjście potrząśnięciem" />
        </SettingRow>
        <SettingRow icon="lock-closed-outline" label="Blokada po bezczynności" last>
          {/* Typed minutes (1–60); an empty or odd value falls back to the last good one on leaving the field. */}
          <TextInput
            style={st.minutes}
            keyboardType="number-pad"
            maxLength={2}
            value={lockText}
            onChangeText={(v) => {
              markActivity();
              const digits = v.replace(/\D/g, '');
              setLockText(digits);
              const n = Number(digits);
              if (n >= 1 && n <= 60) setSettings({ ...settings, autoLockMinutes: n });
            }}
            onBlur={() => setLockText(String(settings.autoLockMinutes))}
            accessibilityLabel="Blokada po bezczynności, minuty"
          />
          <Text style={st.value}>min</Text>
        </SettingRow>
      </List>

      <H2>AI</H2>
      <List>
        <SettingRow icon="sparkles-outline" label="Gemini">
          <Icon name={aiReady ? 'checkmark-circle' : 'close-circle-outline'} size={18} color={aiReady ? C.ok : C.muted} />
          <Text style={[st.value, { color: aiReady ? C.ok : C.muted, marginLeft: 4 }]}>{aiReady ? 'połączone' : 'brak klucza'}</Text>
          {aiReady ? null : <Info text="Klucz z aistudio.google.com wpisz jako EXPO_PUBLIC_GEMINI_API_KEY w pliku .env.local i zbuduj aplikację ponownie." />}
        </SettingRow>
        {/* Names typed here are swapped for [osoba A], [osoba B] before anything goes to the AI. */}
        <SettingRow icon="eye-off-outline" label="Ukryj imiona" last>
          <Info text="Wpisz imiona (także odmienione, np. Marek, Marka, Markiem). Zanim opis trafi do AI, zostaną zamienione na [osoba A], [osoba B]." />
        </SettingRow>
        <TextInput
          style={st.names}
          placeholder="Marek, Marka, Markiem"
          placeholderTextColor="#9AA0A6"
          autoCorrect={false}
          value={profile.namesToHide}
          onChangeText={(v) => {
            markActivity();
            setProfile({ ...profile, namesToHide: v });
          }}
          accessibilityLabel="Imiona do ukrycia przed AI"
        />
      </List>

      <H2>Dane</H2>
      <Btn kind="danger" label="Usuń wszystkie dane Teczki" onPress={wipe} />
    </VaultScreen>
  );
}

/** Settings row: icon in a tinted square, label, control on the right. */
function SettingRow({ icon, label, last, children }: { icon: IconName; label: string; last?: boolean; children: ReactNode }) {
  return (
    <View style={[st.row, !last && st.divider]}>
      <View style={st.rowIcon}>
        <Icon name={icon} size={18} color={C.primary} />
      </View>
      <Text style={st.rowLabel}>{label}</Text>
      {children}
    </View>
  );
}

const st = themed(() => StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, minHeight: 56 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  rowIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  rowLabel: { flex: 1, fontSize: 16, color: C.text },
  value: { fontSize: 15, fontWeight: '600', color: C.primary },
  minutes: { minWidth: 44, textAlign: 'center', fontSize: 16, fontWeight: '600', color: C.primary, backgroundColor: C.bg, borderRadius: 8, paddingVertical: 6, marginRight: 6 },
  names: { marginHorizontal: 14, marginBottom: 12, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: C.bg, fontSize: 15, color: C.text },
  plainRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, minHeight: 52 },
}));
