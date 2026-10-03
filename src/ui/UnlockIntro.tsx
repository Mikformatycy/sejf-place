import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Dimensions, Easing, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { C, OUTLINE, logoText } from './kit';

const SIZE = 24; // the title on the main screen (OutlineText in the header)

/**
 * About a third of a second after the vault opens: the eight strokes of the hollow "sejf-place"
 * slide in from the left, one shortly after another, straight onto the title in the header,
 * and the screen shows through. Transform and opacity only (native driver). A tap skips it;
 * with "reduce motion" it is a short fade. Never shown on the cover, only after the key.
 */
export function UnlockIntro({ onDone }: { onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const [strokes] = useState(() => OUTLINE.map(() => new Animated.Value(0)));
  const [fill] = useState(() => new Animated.Value(0));
  const [leave] = useState(() => new Animated.Value(0));

  useEffect(() => {
    let alive = true;
    let anim: Animated.CompositeAnimation | null = null;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (!alive) return;
      const slide = (v: Animated.Value) => Animated.timing(v, { toValue: 1, duration: 150, easing: Easing.out(Easing.cubic), useNativeDriver: true });
      if (reduced) {
        strokes.forEach((s) => s.setValue(1));
        fill.setValue(1);
      }
      anim = reduced
        ? Animated.timing(leave, { toValue: 1, duration: 200, useNativeDriver: true })
        : Animated.sequence([
            Animated.stagger(15, strokes.map(slide)),
            Animated.timing(fill, { toValue: 1, duration: 45, useNativeDriver: true }),
            Animated.timing(leave, { toValue: 1, duration: 90, useNativeDriver: true }),
          ]);
      anim.start(({ finished }) => finished && onDone());
    });
    return () => {
      alive = false;
      anim?.stop();
    };
  }, [strokes, fill, leave, onDone]);

  const { width: W } = Dimensions.get('window');
  const base = logoText(SIZE);
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: C.bg, opacity: leave.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onDone} accessibilityLabel="Pomiń">
        {/* Exactly where the header's title is: left edge + header centre. */}
        <View style={{ position: 'absolute', left: 16, top: insets.top + 28 - SIZE * 0.65 }}>
          {OUTLINE.map(([x, y], i) => (
            <Animated.Text
              key={i}
              importantForAccessibility="no"
              numberOfLines={1}
              style={[
                base,
                {
                  position: 'absolute',
                  left: x,
                  top: y,
                  color: C.primary,
                  opacity: strokes[i].interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 1] }),
                  // From off the left edge, each stroke a little higher or lower, landing in place.
                  transform: [
                    { translateX: strokes[i].interpolate({ inputRange: [0, 1], outputRange: [-W, 0] }) },
                    { translateY: strokes[i].interpolate({ inputRange: [0, 1], outputRange: [(i - 3.5) * 6, 0] }) },
                  ],
                },
              ]}
            >
              sejf-place
            </Animated.Text>
          ))}
          {/* The filled copy that turns the strokes into a hollow outline. */}
          <Animated.Text numberOfLines={1} style={[base, { color: C.bg, opacity: fill }]}>
            sejf-place
          </Animated.Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}
