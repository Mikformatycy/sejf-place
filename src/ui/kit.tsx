import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useRef, useState, type ComponentProps, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { markActivity, quickExit } from '@/vault/quickExit';

import { C, themed } from './theme';

export { C };

export type IconName = ComponentProps<typeof Ionicons>['name'];

export function Icon({ name, size = 24, color = C.text }: { name: IconName; size?: number; color?: string }) {
  return <Ionicons name={name} size={size} color={color} />;
}

/** Round icon button. `label` is read by screen readers (the screen shows only the icon). */
export function IconBtn({
  icon,
  label,
  onPress,
  color = C.text,
  bg = 'transparent',
  size = 44,
  disabled,
  raised,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  color?: string;
  bg?: string;
  size?: number;
  disabled?: boolean;
  /** Floating button with a shadow. */
  raised?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      style={({ pressed }) => [
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' },
        raised && s.raised,
        (pressed || disabled) && { opacity: 0.5 },
      ]}
    >
      <Ionicons name={icon} size={Math.round(size * 0.55)} color={color} />
    </Pressable>
  );
}

/** Plain-JS slider (no native module): drag or tap the track; screen readers swipe up/down. */
export function Slider({
  value,
  min,
  max,
  onChange,
  label,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  label: string;
}) {
  const track = useRef<View>(null);
  const [geo, setGeo] = useState({ x: 0, width: 0 });

  const setFromPageX = (pageX: number) => {
    if (!geo.width) return;
    const ratio = Math.min(1, Math.max(0, (pageX - geo.x) / geo.width));
    const v = Math.round(min + ratio * (max - min));
    if (v !== value) onChange(v);
  };

  // Recreated each render so it always sees the current value; it only reads pageX, so nothing is lost.
  const responder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (e) => setFromPageX(e.nativeEvent.pageX),
    onPanResponderMove: (e) => setFromPageX(e.nativeEvent.pageX),
  });

  const pct = `${((value - min) / (max - min)) * 100}%` as const;
  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ min, max, now: value }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => onChange(Math.min(max, Math.max(min, value + (e.nativeEvent.actionName === 'increment' ? 1 : -1))))}
      style={s.sliderBox}
      {...responder.panHandlers}
    >
      <View
        ref={track}
        onLayout={() => track.current?.measureInWindow((x, _y, width) => setGeo({ x, width }))}
        style={s.sliderTrack}
      >
        <View style={[s.sliderFill, { width: pct }]} />
        <View style={[s.sliderThumb, { left: pct }]} />
      </View>
    </View>
  );
}

/** Small icon + label pill (status, flags); replaces "Label: value" lines. */
export function IconChip({ icon, text, color = C.primary, bg = C.primarySoft }: { icon: IconName; text: string; color?: string; bg?: string }) {
  return (
    <View style={[s.iconChip, { backgroundColor: bg }]}>
      <Ionicons name={icon} size={15} color={color} />
      <Text style={[s.iconChipText, { color }]} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

export interface HeaderAction {
  icon: IconName;
  label: string;
  onPress: () => void;
}

/**
 * Standard vault screen: back, title, optional icon actions, and the always-visible
 * quick exit (✕). `overlay` is drawn above the content (e.g. floating buttons).
 */
export function VaultScreen({
  title,
  back = true,
  children,
  scroll = true,
  footer,
  actions = [],
  overlay,
}: {
  title: string;
  back?: boolean;
  children: ReactNode;
  scroll?: boolean;
  footer?: ReactNode;
  actions?: HeaderAction[];
  overlay?: ReactNode;
}) {
  return (
    <SafeAreaView style={s.screen} edges={['top', 'bottom']}>
      <View style={s.header}>
        {back ? <IconBtn icon="chevron-back" label="Wstecz" onPress={() => router.back()} color={C.primary} /> : null}
        <Text style={[s.title, !back && { marginLeft: 8 }]} numberOfLines={1}>
          {title}
        </Text>
        {actions.map((a) => (
          <IconBtn key={a.label} icon={a.icon} label={a.label} onPress={a.onPress} color={C.muted} />
        ))}
        <IconBtn icon="close" label="Szybkie wyjście" onPress={quickExit} color={C.accent} bg={C.accentSoft} />
      </View>
      <View style={{ flex: 1 }}>
        {scroll ? (
          <ScrollView contentContainerStyle={[s.content, overlay ? { paddingBottom: 110 } : null]} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        ) : (
          <View style={[s.content, { flex: 1 }]}>{children}</View>
        )}
        {overlay}
      </View>
      {footer ? <View style={s.footer}>{footer}</View> : null}
    </SafeAreaView>
  );
}

/** Rounded button with a tinted background; the entry's actions share this shape. */
export function PillBtn({
  label,
  onPress,
  disabled,
  busy,
  icon,
  color = C.primary,
  bg = C.primarySoft,
  style,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  icon?: IconName;
  color?: string;
  bg?: string;
  style?: ViewStyle;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled || busy}
      style={({ pressed }) => [s.pill, { backgroundColor: bg, borderColor: color, opacity: disabled ? 0.45 : pressed ? 0.7 : 1 }, style]}
    >
      {busy ? <ActivityIndicator color={color} /> : icon ? <Ionicons name={icon} size={20} color={color} /> : null}
      <Text style={[s.pillText, { color }]}>{label}</Text>
    </Pressable>
  );
}

/** Everything that goes to the AI, in its own colour so it is not mistaken for saving. */
export function AiBtn(props: { label: string; onPress: () => void; disabled?: boolean; busy?: boolean; style?: ViewStyle }) {
  return <PillBtn {...props} icon="sparkles" color={C.ai} bg={C.aiSoft} />;
}

type BtnKind = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Btn({
  label,
  onPress,
  kind = 'primary',
  disabled,
  busy,
  style,
}: {
  label: string;
  onPress: () => void;
  kind?: BtnKind;
  disabled?: boolean;
  busy?: boolean;
  style?: ViewStyle;
}) {
  const bg = { primary: C.primary, secondary: C.primarySoft, ghost: 'transparent', danger: C.danger }[kind];
  const fg = { primary: '#fff', secondary: C.primary, ghost: C.primary, danger: '#fff' }[kind];
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || busy}
      style={({ pressed }) => [s.btn, { backgroundColor: bg, opacity: disabled ? 0.45 : pressed ? 0.8 : 1 }, style]}
    >
      {busy ? <ActivityIndicator color={fg} /> : <Text style={[s.btnText, { color: fg }]}>{label}</Text>}
    </Pressable>
  );
}

export function Card({ children, style, onPress }: { children: ReactNode; style?: ViewStyle; onPress?: () => void }) {
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [s.card, style, pressed && { opacity: 0.85 }]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[s.card, style]}>{children}</View>;
}

export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: !!selected }}
      onPress={onPress}
      style={[s.chip, selected && { backgroundColor: C.primary, borderColor: C.primary }]}
    >
      <Text style={[s.chipText, selected && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

/** ⓘ that opens a small bubble with an explanation, so the screen itself stays clean. */
export function Info({ text, color = C.muted }: { text: string; color?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel={text} onPress={() => setOpen(true)} hitSlop={10} style={{ marginLeft: 6 }}>
        <Ionicons name="information-circle-outline" size={18} color={color} />
      </Pressable>
      <Modal transparent animationType="fade" visible={open} onRequestClose={() => setOpen(false)}>
        <Pressable style={s.tipBackdrop} onPress={() => setOpen(false)}>
          <View style={s.tip}>
            <Ionicons name="information-circle" size={22} color={C.primary} />
            <Text style={s.tipText}>{text}</Text>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

export function Field({ label, hint, onChangeText, ...input }: TextInputProps & { label: string; hint?: string }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <View style={[s.labelRow, { marginBottom: 6 }]}>
        <Text style={[s.label, { marginBottom: 0 }]}>{label}</Text>
        {hint ? <Info text={hint} /> : null}
      </View>
      <TextInput
        placeholderTextColor="#9AA0A6"
        autoCorrect={false}
        {...input}
        // Typing involves no touches, so it has to count as activity for the auto-lock.
        onChangeText={(t) => {
          markActivity();
          onChangeText?.(t);
        }}
        style={[s.input, input.multiline && { minHeight: 110, textAlignVertical: 'top' }, input.style]}
      />
    </View>
  );
}

/** Grouped list in the style of a settings screen. */
export function List({ children }: { children: ReactNode }) {
  return <View style={s.list}>{children}</View>;
}

export function Row({
  title,
  subtitle,
  right,
  onPress,
  last,
}: {
  title: string;
  subtitle?: string;
  right?: string;
  onPress?: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [s.listRow, !last && s.listDivider, pressed && { backgroundColor: C.bg }]}
    >
      <View style={{ flex: 1 }}>
        <Text style={s.rowTitle}>{title}</Text>
        {subtitle ? <Text style={s.rowSub}>{subtitle}</Text> : null}
      </View>
      {right ? <Text style={s.rowRight}>{right}</Text> : null}
      {onPress ? <Ionicons name="chevron-forward" size={20} color={C.muted} style={{ marginLeft: 6 }} /> : null}
    </Pressable>
  );
}

/** List row with a checkbox (or radio), for picking from a list; `nested` rows sit under a parent row. */
export function CheckRow({
  label,
  checked,
  onPress,
  icon,
  iconColor,
  right,
  radio,
  nested,
  last,
}: {
  label: string;
  checked: boolean;
  onPress: () => void;
  icon?: IconName;
  /** Colour of the icon (e.g. the kind of violence); otherwise blue when ticked. */
  iconColor?: string;
  right?: string;
  radio?: boolean;
  nested?: boolean;
  last?: boolean;
}) {
  const mark = radio ? (checked ? 'radio-button-on' : 'radio-button-off') : checked ? 'checkbox' : 'square-outline';
  return (
    <Pressable
      accessibilityRole={radio ? 'radio' : 'checkbox'}
      accessibilityState={{ checked }}
      onPress={onPress}
      style={({ pressed }) => [s.listRow, nested && s.nestedRow, !last && s.listDivider, pressed && { backgroundColor: C.border }]}
    >
      {icon ? <Ionicons name={icon} size={20} color={iconColor ?? (checked ? C.primary : C.muted)} style={{ marginRight: 12 }} /> : null}
      <Text style={[s.rowTitle, { flex: 1 }, nested && { fontSize: 15 }, checked && !nested && { fontWeight: '600' }]}>{label}</Text>
      {right ? <Text style={s.rowRight}>{right}</Text> : null}
      <Ionicons name={mark} size={22} color={checked ? C.primary : C.muted} style={{ marginLeft: 10 }} />
    </Pressable>
  );
}

/** On/off switch drawn in JS: looks and lines up the same on Android and iPhone. */
export function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      hitSlop={8}
      style={[s.toggle, { backgroundColor: value ? C.primary : C.border }]}
    >
      <View style={[s.toggleThumb, value && { alignSelf: 'flex-end' }]} />
    </Pressable>
  );
}

export function ToggleRow({ label, value, onChange, hint }: { label: string; value: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <View style={s.toggleRow}>
      <View style={{ flex: 1, paddingRight: 12, flexDirection: 'row', alignItems: 'center' }}>
        <Text style={[s.body, { flexShrink: 1 }]}>{label}</Text>
        {hint ? <Info text={hint} /> : null}
      </View>
      <Toggle value={value} onChange={onChange} label={label} />
    </View>
  );
}

export function H2({ children, info }: { children: ReactNode; info?: string }) {
  if (!info) return <Text style={s.h2}>{children}</Text>;
  return (
    <View style={s.labelRow}>
      <Text style={s.h2}>{children}</Text>
      <View style={{ marginTop: 12 }}>
        <Info text={info} />
      </View>
    </View>
  );
}

export function P({ children, muted, style }: { children: ReactNode; muted?: boolean; style?: object }) {
  return <Text style={[s.body, muted && { color: C.muted }, style]}>{children}</Text>;
}

export function Notice({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'warn' | 'ok' }) {
  const bg = { info: C.primarySoft, warn: C.warnSoft, ok: C.okSoft }[tone];
  const fg = { info: C.primary, warn: C.warn, ok: C.ok }[tone];
  return (
    <View style={[s.notice, { backgroundColor: bg }]}>
      <Text style={[s.body, { color: fg }]}>{children}</Text>
    </View>
  );
}

export const s = themed(() => StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 6,
    gap: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
    backgroundColor: C.surface,
  },
  title: { flex: 1, fontSize: 19, fontWeight: '700', color: C.text, marginLeft: 2 },
  content: { padding: 16, paddingBottom: 40 },
  footer: { padding: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border, backgroundColor: C.surface },
  btn: { minHeight: 48, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, marginVertical: 5 },
  btnText: { fontSize: 16, fontWeight: '600' },
  card: { backgroundColor: C.surface, borderRadius: 8, padding: 14, marginBottom: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border },
  chip: { borderWidth: 1, borderColor: C.border, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8, marginBottom: 8, backgroundColor: C.surface },
  chipText: { color: C.text, fontSize: 14 },
  label: { fontSize: 14, fontWeight: '600', color: C.text, marginBottom: 6 },
  input: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, color: C.text },
  hint: { fontSize: 13, color: C.muted, marginTop: 4, lineHeight: 18 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  h2: { fontSize: 13, fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 20, marginBottom: 8 },
  body: { fontSize: 15, lineHeight: 22, color: C.text },
  notice: { borderRadius: 8, padding: 12, marginBottom: 12 },
  row: { flexDirection: 'row', flexWrap: 'wrap' },
  list: { backgroundColor: C.surface, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border, overflow: 'hidden', marginBottom: 10 },
  listRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, minHeight: 52 },
  listDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  nestedRow: { backgroundColor: C.bg, paddingLeft: 46, paddingVertical: 9, minHeight: 44 },
  rowTitle: { fontSize: 16, color: C.text },
  rowSub: { fontSize: 13, color: C.muted, marginTop: 2, lineHeight: 18 },
  rowRight: { fontSize: 13, color: C.muted, marginLeft: 8 },
  iconChip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5, marginRight: 6, marginBottom: 6, maxWidth: '100%' },
  iconChipText: { fontSize: 13, fontWeight: '600', flexShrink: 1 },
  labelRow: { flexDirection: 'row', alignItems: 'center' },
  sliderBox: { paddingVertical: 14, paddingHorizontal: 12 },
  sliderTrack: { height: 6, borderRadius: 3, backgroundColor: C.border, justifyContent: 'center' },
  sliderFill: { position: 'absolute', left: 0, height: 6, borderRadius: 3, backgroundColor: C.primary },
  sliderThumb: { position: 'absolute', width: 26, height: 26, borderRadius: 13, marginLeft: -13, backgroundColor: C.surface, borderWidth: 2, borderColor: C.primary },
  tipBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)', justifyContent: 'center', padding: 32 },
  tip: { flexDirection: 'row', gap: 10, backgroundColor: C.surface, borderRadius: 14, padding: 16, alignItems: 'flex-start' },
  tipText: { flex: 1, fontSize: 15, lineHeight: 21, color: C.text },
  pill: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 52, paddingHorizontal: 18, borderRadius: 26, borderWidth: 1, marginBottom: 10 },
  pillText: { fontSize: 16, fontWeight: '700' },
  toggle: { width: 50, height: 30, borderRadius: 15, padding: 3, justifyContent: 'center' },
  toggleThumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff' },
  raised: { elevation: 4, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
}));
