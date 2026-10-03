import { router } from 'expo-router';
import { Children, useEffect, useState, type ReactNode } from 'react';
import { Keyboard, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useDraft } from '@/vault/evidence';

import { C, Icon, type IconName } from './kit';
import { themed } from './theme';

// Same sizes as the entry screen's bar and its "głos rozsądku" button, so the screens match.
const PLUS_D = 80; // the new-entry button
const PLUS_W = 100; // gap left for it in the bar
const NAV_H = 60;
// The button is centred on the bar and pokes out by (PLUS_D - NAV_H) / 2 above and below it;
// the bar itself takes no extra room, so there is no empty strip above it.

type Tab = 'index' | 'telefony' | 'pomoc' | 'ustawienia';
const HREF: Record<Tab, '/sejf' | '/sejf/telefony' | '/sejf/pomoc' | '/sejf/ustawienia'> = {
  index: '/sejf',
  telefony: '/sejf/telefony',
  pomoc: '/sejf/pomoc',
  ustawienia: '/sejf/ustawienia',
};

/**
 * The vault's bottom bar, always visible on its main screens (a tab bar): entries, helplines,
 * the new-entry button rising from the middle, help and settings. Hidden while typing.
 */
export function BottomBar({ active }: { active: string }) {
  const hasDraft = useDraft((d) => d.key === 'new' && (d.attachments.length > 0 || !!d.fields?.description));
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setTyping(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setTyping(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  if (typing) return null;

  const tab = (name: Tab, icon: IconName, activeIcon: IconName, label: string) => {
    const on = active === name;
    return (
      <Pressable
        accessibilityRole="tab"
        accessibilityState={{ selected: on }}
        accessibilityLabel={label}
        onPress={() => (on ? undefined : router.navigate(HREF[name]))}
        style={({ pressed }) => [st.tab, pressed && { opacity: 0.6 }]}
      >
        {/* The current screen gets a soft pill behind its icon. */}
        <View style={[st.pill, on && { backgroundColor: C.primarySoft }]}>
          <Icon name={on ? activeIcon : icon} size={26} color={on ? C.primary : C.muted} />
        </View>
      </Pressable>
    );
  };

  return (
    <BarShell
      center={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={hasDraft ? 'Dokończ wpis' : 'Nowy wpis'}
          onPress={() => router.push('/sejf/nowy')}
          style={({ pressed }) => [st.plus, pressed && { transform: [{ scale: 0.92 }] }]}
        >
          <Icon name="add" size={40} color="#fff" />
        </Pressable>
      }
      centerTop={(NAV_H - PLUS_D) / 2}
      centerWidth={PLUS_W}
    >
      {tab('telefony', 'call-outline', 'call-outline', 'Telefony pomocowe')}
      {tab('index', 'folder-outline', 'folder', 'Wpisy')}
      {tab('pomoc', 'help-circle-outline', 'help-circle-outline', 'Pomoc')}
      {tab('ustawienia', 'settings-outline', 'settings-outline', 'Ustawienia')}
    </BarShell>
  );
}

/**
 * The one bottom bar of the vault (main screens and an entry): white down to the screen's edge,
 * 60 pt high, a big round button centred on it. Children are split evenly around the button.
 * `centerTop` places the button's box relative to the bar's top edge.
 */
export function BarShell({ children, center, centerTop, centerWidth }: { children: ReactNode; center: ReactNode; centerTop: number; centerWidth: number }) {
  const insets = useSafeAreaInsets();
  const items = Children.toArray(children);
  const half = Math.ceil(items.length / 2);
  return (
    <View style={{ backgroundColor: C.surface, paddingBottom: insets.bottom }}>
      <View style={st.nav}>
        {items.slice(0, half)}
        <View style={{ width: centerWidth }} />
        {items.slice(half)}
      </View>
      <View style={[st.centerWrap, { top: centerTop }]} pointerEvents="box-none">
        {center}
      </View>
    </View>
  );
}

export const BAR_H = NAV_H;

const st = themed(() =>
  StyleSheet.create({
    nav: {
      flexDirection: 'row',
      alignItems: 'center',
      height: NAV_H,
      backgroundColor: C.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: C.border,
    },
    tab: { flex: 1, alignItems: 'center', justifyContent: 'center', height: NAV_H },
    pill: { width: 60, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
    centerWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
    plus: {
      width: PLUS_D,
      height: PLUS_D,
      borderRadius: PLUS_D / 2,
      backgroundColor: C.add,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 4,
      borderColor: C.surface,
      elevation: 5,
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 7,
      shadowOffset: { width: 0, height: 3 },
    },
  }),
);
