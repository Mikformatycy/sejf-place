import { StatusBar } from 'expo-status-bar';
import { createContext, useContext, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/ui/kit';

/** Same key, same colour: a person, a book or a plant keeps its colour between visits. */
export function tint<T>(key: string, palette: readonly T[]): T {
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return palette[h % palette.length];
}

// Fixed spots (percent of the screen), so the pattern never jumps and costs nothing to compute.
const SPOTS = [
  { top: 6, left: 72, size: 38, rot: -14 },
  { top: 14, left: 8, size: 28, rot: 12 },
  { top: 27, left: 84, size: 30, rot: 20 },
  { top: 35, left: 30, size: 24, rot: -8 },
  { top: 46, left: 4, size: 36, rot: -20 },
  { top: 52, left: 62, size: 26, rot: 8 },
  { top: 64, left: 86, size: 34, rot: -6 },
  { top: 71, left: 22, size: 28, rot: 16 },
  { top: 82, left: 54, size: 36, rot: -12 },
  { top: 90, left: 10, size: 26, rot: 10 },
];

/**
 * A very faint pattern of themed icons behind a cover (candles for birthdays, leaves for plants).
 * Static views only: no images, no animation.
 */
export function Backdrop({ icons, colors, opacity = 0.09 }: { icons: IconName[]; colors: string[]; opacity?: number }) {
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity }]}>
      {SPOTS.map((s, i) => (
        <View key={i} style={{ position: 'absolute', top: `${s.top}%`, left: `${s.left}%`, transform: [{ rotate: `${s.rot}deg` }] }}>
          <Icon name={icons[i % icons.length]} size={s.size} color={colors[i % colors.length]} />
        </View>
      ))}
    </View>
  );
}

/** True when the cover is shown under the key recorder's banner (it must not restyle the status bar there). */
export const CoverEmbedded = createContext(false);

/**
 * Coloured header of a cover: title, a few round icon buttons and the one thing worth seeing first
 * (the next birthday, today's water…). Reaches under the status bar like a real app's header.
 */
export function Hero({ color, title, right, children, icons }: { color: string; title: string; right?: ReactNode; children?: ReactNode; icons?: IconName[] }) {
  const embedded = useContext(CoverEmbedded);
  return (
    <SafeAreaView edges={['top']} style={[hero.box, { backgroundColor: color }]}>
      {embedded ? null : <StatusBar style="light" />}
      {icons ? <Backdrop icons={icons} colors={['#FFFFFF']} opacity={0.16} /> : null}
      <View style={hero.row}>
        <Text style={hero.title} numberOfLines={1}>
          {title}
        </Text>
        {right}
      </View>
      {children}
    </SafeAreaView>
  );
}

/** Round, see-through white button for the coloured header. */
export function HeroBtn({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={6} style={({ pressed }) => [hero.btn, pressed && { opacity: 0.6 }]}>
      <Icon name={icon} size={20} color="#fff" />
    </Pressable>
  );
}

const hero = StyleSheet.create({
  box: { paddingHorizontal: 16, paddingBottom: 18, borderBottomLeftRadius: 26, borderBottomRightRadius: 26, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 10 },
  title: { flex: 1, fontSize: 28, fontWeight: '800', color: '#fff' },
  btn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
});
