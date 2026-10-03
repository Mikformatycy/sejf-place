import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { joinSequence, SEQUENCE_STEPS } from '@/covers/sequence';
import { Icon, Info, type IconName } from '@/ui/kit';

import { Backdrop, Hero, HeroBtn } from './decor';
import { secretSafeInput, todayKey, usePersisted, useStepRecorder, type CoverProps } from './shared';

type Drink = 'woda' | 'herbata' | 'kawa';
const DRINKS: { id: Drink; label: string; icon: IconName; ml: number; color: string; soft: string }[] = [
  { id: 'woda', label: 'Woda', icon: 'water', ml: 250, color: '#0288D1', soft: '#D6EFF6' },
  { id: 'herbata', label: 'Herbata', icon: 'leaf', ml: 250, color: '#558B2F', soft: '#E3F0D8' },
  { id: 'kawa', label: 'Kawa', icon: 'cafe', ml: 150, color: '#8D5B3A', soft: '#F1E4D9' },
];

interface Log {
  [day: string]: { ml: number; items: { drink: Drink | 'inne'; ml: number; at: string }[]; note?: string };
}

const W = { bg: '#F1FAFC', text: '#0E3A4A', muted: '#5D8796', accent: '#0288D1', soft: '#D6EFF6', card: '#FFFFFF' };

export default function WodaCover({ check }: CoverProps) {
  const [goal, setGoal] = usePersisted<number>('woda.goal', 2000);
  const [log, setLog] = usePersisted<Log>('woda.log', {});
  const [view, setView] = useState<'main' | 'settings'>('main');
  const [custom, setCustom] = useState<string | null>(null);
  const [goalInput, setGoalInput] = useState('');
  const today = todayKey();
  const day = log[today] ?? { ml: 0, items: [] };
  // null = show the saved note; a string = the user is editing.
  const [noteDraft, setNoteDraft] = useState<string | null>(null);
  const note = noteDraft ?? day.note ?? '';

  // Drink taps form a sequence key; undo them if it unlocks.
  const snapshot = useRef<Log | null>(null);
  const seq = useStepRecorder(async (steps, final, stop) => {
    const before = snapshot.current;
    if (final) snapshot.current = null;
    if (steps.length >= 2 && (await check('drinkSeq', joinSequence(steps), undefined, { partial: !final }))) {
      stop();
      snapshot.current = null;
      if (before) setLog(before);
    }
  }, SEQUENCE_STEPS);

  const add = (drink: Drink | 'inne', ml: number) =>
    setLog((l) => {
      const d = l[today] ?? { ml: 0, items: [] };
      return { ...l, [today]: { ...d, ml: d.ml + ml, items: [...d.items, { drink, ml, at: new Date().toISOString() }] } };
    });

  const tapDrink = (d: (typeof DRINKS)[number]) => {
    if (!snapshot.current) snapshot.current = log;
    seq.push(d.id);
    add(d.id, d.ml);
  };

  if (view === 'settings') {
    return (
      <SafeAreaView style={st.screen}>
        <View style={[st.header, { padding: 16, justifyContent: 'flex-start', gap: 8 }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Wróć" onPress={() => setView('main')} hitSlop={10}>
            <Icon name="chevron-back" size={26} color={W.accent} />
          </Pressable>
          <Text style={st.h1}>Cel</Text>
        </View>
        <View style={{ paddingHorizontal: 16 }}>
          <View style={st.labelRow}>
            <Text style={[st.label, { marginTop: 0, marginBottom: 0 }]}>Dzienny cel (ml)</Text>
            <Info text="Zalecenia mówią zwykle o 1,5–2 litrach płynów dziennie, ale cel zależy od wieku, wagi i aktywności." color={W.muted} />
          </View>
          <TextInput
            {...secretSafeInput}
            keyboardType="number-pad"
            value={goalInput}
            onChangeText={(t) => setGoalInput(t.replace(/\D/g, ''))}
            placeholder={String(goal)}
            placeholderTextColor={W.muted}
            style={st.input}
          />
          <Pressable
            style={st.btn}
            onPress={async () => {
              if (!goalInput) return;
              if (!(await check('goal', goalInput))) setGoal(Math.min(10000, Math.max(500, Number(goalInput))));
              setGoalInput('');
              setView('main');
            }}
          >
            <Text style={st.btnText}>Zapisz</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const pct = Math.min(1, day.ml / goal);
  // Days in a row (before today) when the goal was reached: a small reason to come back.
  let streak = 0;
  for (let i = 1; i < 60; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    if ((log[todayKey(d)]?.ml ?? 0) < goal) break;
    streak++;
  }
  const last7 = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const k = todayKey(d);
    return { k, label: ['nd', 'pn', 'wt', 'śr', 'cz', 'pt', 'sb'][d.getDay()], ml: log[k]?.ml ?? 0 };
  });

  return (
    <SafeAreaView style={st.screen} edges={[]}>
      <Backdrop icons={['water-outline', 'water', 'ellipse-outline']} colors={['#4FC3F7', '#29B6F6', '#81D4FA']} opacity={0.12} />
      <Hero
        color={W.accent}
        title="Pij wodę"
        icons={['water', 'water-outline', 'ellipse-outline']}
        right={<HeroBtn icon="options-outline" label="Dzienny cel" onPress={() => setView('settings')} />}
      >
        {/* A glass that fills up during the day. */}
        <View style={st.today}>
          <View style={st.glass}>
            <View style={[st.water, { height: `${Math.max(4, pct * 100)}%` }]} />
            {pct >= 1 ? (
              <View style={st.glassIcon}>
                <Icon name="checkmark" size={26} color={W.accent} />
              </View>
            ) : null}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={st.amount}>{(day.ml / 1000).toFixed(2).replace('.', ',')} l</Text>
            <Text style={st.ofGoal}>z {(goal / 1000).toFixed(1).replace('.', ',')} l</Text>
            {streak > 0 ? (
              <View style={st.streak}>
                <Icon name="flame" size={16} color="#FFB74D" />
                <Text style={st.streakText}>{streak}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </Hero>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">

        <View style={[st.drinks, { marginTop: 0 }]}>
          {DRINKS.map((d) => (
            <Pressable key={d.id} onPress={() => tapDrink(d)} style={st.drink}>
              <View style={[st.drinkIcon, { backgroundColor: d.soft }]}>
                <Icon name={d.icon} size={26} color={d.color} />
              </View>
              <Text style={st.drinkLabel}>{d.label}</Text>
              <Text style={st.muted}>+{d.ml} ml</Text>
            </Pressable>
          ))}
        </View>

        {custom === null ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Inna ilość" onPress={() => setCustom('')} style={st.more}>
            <Icon name="add-circle-outline" size={20} color={W.accent} />
            <Text style={st.link}>ml</Text>
          </Pressable>
        ) : (
          <View style={st.row}>
            <TextInput
              {...secretSafeInput}
              autoFocus
              keyboardType="number-pad"
              value={custom}
              onChangeText={(t) => setCustom(t.replace(/\D/g, ''))}
              placeholder="ml"
              placeholderTextColor={W.muted}
              style={[st.input, { flex: 1 }]}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Dodaj"
              style={[st.btn, st.round, { marginTop: 0, marginLeft: 8 }]}
              onPress={async () => {
                if (custom && !(await check('customAmount', custom))) add('inne', Math.min(3000, Number(custom)));
                setCustom(null);
              }}
            >
              <Icon name="checkmark" size={22} color="#fff" />
            </Pressable>
          </View>
        )}

        <View style={st.sectionRow}>
          <Icon name="stats-chart-outline" size={18} color={W.text} />
          <Text style={st.section}>7 dni</Text>
        </View>
        <View style={st.chart}>
          {last7.map((d) => (
            <View key={d.k} style={st.col}>
              <View style={[st.colBar, { height: 6 + Math.min(1, d.ml / goal) * 90, opacity: d.k === today ? 1 : 0.6 }, d.ml >= goal && { backgroundColor: '#43A047' }]} />
              <Text style={st.colLabel}>{d.label}</Text>
            </View>
          ))}
        </View>

        <View style={st.sectionRow}>
          <Icon name="create-outline" size={18} color={W.text} />
          <Text style={st.section}>Notatka</Text>
        </View>
        <TextInput
          {...secretSafeInput}
          multiline
          value={note}
          onChangeText={setNoteDraft}
          placeholder="więcej wody po treningu"
          placeholderTextColor={W.muted}
          style={[st.input, { minHeight: 70, textAlignVertical: 'top' }]}
        />
        <Pressable
          style={st.btn}
          onPress={async () => {
            if (note.trim() && (await check('note', note))) {
              setNoteDraft(null);
              return;
            }
            setLog((l) => ({ ...l, [today]: { ...(l[today] ?? { ml: 0, items: [] }), note } }));
            setNoteDraft(null);
          }}
        >
          <Text style={st.btnText}>Zapisz</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: W.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  h1: { fontSize: 28, fontWeight: '800', color: W.text },
  link: { color: W.accent, fontSize: 16, fontWeight: '600' },
  today: { flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 14 },
  glass: { width: 64, height: 92, borderWidth: 3, borderColor: 'rgba(255,255,255,0.9)', borderTopWidth: 0, borderBottomLeftRadius: 16, borderBottomRightRadius: 16, overflow: 'hidden', justifyContent: 'flex-end' },
  water: { backgroundColor: '#B3E5FC', width: '100%' },
  glassIcon: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center' },
  amount: { fontSize: 40, fontWeight: '300', color: '#fff' },
  ofGoal: { fontSize: 15, color: '#E1F5FE' },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginTop: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  streakText: { color: '#fff', fontWeight: '700' },
  muted: { color: W.muted, fontSize: 13 },
  bar: { height: 12, backgroundColor: W.soft, borderRadius: 6, width: '100%', marginTop: 14, overflow: 'hidden' },
  barFill: { height: 12, backgroundColor: W.accent, borderRadius: 6 },
  drinks: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  drink: { flex: 1, backgroundColor: W.card, borderRadius: 16, paddingVertical: 14, marginHorizontal: 4, alignItems: 'center' },
  drinkIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: W.soft, alignItems: 'center', justifyContent: 'center' },
  drinkLabel: { fontWeight: '700', color: W.text, marginTop: 6 },
  more: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginVertical: 10 },
  round: { width: 46, height: 46, borderRadius: 23, paddingVertical: 0, justifyContent: 'center' },
  labelRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, marginBottom: 6 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 22, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  input: { backgroundColor: W.card, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, color: W.text, borderWidth: 1, borderColor: W.soft },
  btn: { backgroundColor: W.accent, borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 10 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  section: { fontSize: 17, fontWeight: '700', color: W.text },
  chart: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 120, backgroundColor: W.card, borderRadius: 16, padding: 12 },
  col: { alignItems: 'center', flex: 1 },
  colBar: { width: 18, backgroundColor: W.accent, borderRadius: 6 },
  colLabel: { fontSize: 12, color: W.muted, marginTop: 4 },
  label: { fontSize: 14, fontWeight: '600', color: W.text, marginTop: 16, marginBottom: 6 },
});
