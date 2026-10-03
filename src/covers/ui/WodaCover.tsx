import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { joinSequence, SEQUENCE_STEPS } from '@/covers/sequence';

import { secretSafeInput, todayKey, usePersisted, useStepRecorder, type CoverProps } from './shared';

type Drink = 'woda' | 'herbata' | 'kawa';
const DRINKS: { id: Drink; label: string; icon: string; ml: number }[] = [
  { id: 'woda', label: 'Woda', icon: '💧', ml: 250 },
  { id: 'herbata', label: 'Herbata', icon: '🍵', ml: 250 },
  { id: 'kawa', label: 'Kawa', icon: '☕', ml: 150 },
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
        <Pressable onPress={() => setView('main')} style={{ padding: 16 }}>
          <Text style={st.link}>‹ Wróć</Text>
        </Pressable>
        <View style={{ padding: 16 }}>
          <Text style={st.h1}>Ustawienia</Text>
          <Text style={st.label}>Dzienny cel (ml)</Text>
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
          <Text style={st.hint}>Zalecenia mówią zwykle o 1,5–2 litrach płynów dziennie, ale cel zależy od wieku, wagi i aktywności.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const pct = Math.min(1, day.ml / goal);
  const last7 = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const k = todayKey(d);
    return { k, label: ['nd', 'pn', 'wt', 'śr', 'cz', 'pt', 'sb'][d.getDay()], ml: log[k]?.ml ?? 0 };
  });

  return (
    <SafeAreaView style={st.screen}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <View style={st.header}>
          <Text style={st.h1}>Pij wodę</Text>
          <Pressable onPress={() => setView('settings')} hitSlop={10}>
            <Text style={st.link}>Ustawienia</Text>
          </Pressable>
        </View>

        <View style={st.progressCard}>
          <Text style={st.amount}>{(day.ml / 1000).toFixed(2).replace('.', ',')} l</Text>
          <Text style={st.muted}>z {(goal / 1000).toFixed(1).replace('.', ',')} l celu</Text>
          <View style={st.bar}>
            <View style={[st.barFill, { width: `${pct * 100}%` }]} />
          </View>
        </View>

        <View style={st.drinks}>
          {DRINKS.map((d) => (
            <Pressable key={d.id} onPress={() => tapDrink(d)} style={st.drink}>
              <Text style={{ fontSize: 30 }}>{d.icon}</Text>
              <Text style={st.drinkLabel}>{d.label}</Text>
              <Text style={st.muted}>+{d.ml} ml</Text>
            </Pressable>
          ))}
        </View>

        {custom === null ? (
          <Pressable onPress={() => setCustom('')}>
            <Text style={[st.link, { textAlign: 'center', marginVertical: 8 }]}>+ Inna ilość</Text>
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
              style={[st.btn, { marginTop: 0, marginLeft: 8, paddingHorizontal: 18 }]}
              onPress={async () => {
                if (custom && !(await check('customAmount', custom))) add('inne', Math.min(3000, Number(custom)));
                setCustom(null);
              }}
            >
              <Text style={st.btnText}>Dodaj</Text>
            </Pressable>
          </View>
        )}

        <Text style={st.section}>Ostatnie 7 dni</Text>
        <View style={st.chart}>
          {last7.map((d) => (
            <View key={d.k} style={st.col}>
              <View style={[st.colBar, { height: 6 + Math.min(1, d.ml / goal) * 90, opacity: d.k === today ? 1 : 0.55 }]} />
              <Text style={st.colLabel}>{d.label}</Text>
            </View>
          ))}
        </View>

        <Text style={st.section}>Notatka dnia</Text>
        <TextInput
          {...secretSafeInput}
          multiline
          value={note}
          onChangeText={setNoteDraft}
          placeholder="np. więcej wody po treningu"
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
  progressCard: { backgroundColor: W.card, borderRadius: 18, padding: 20, marginTop: 16, alignItems: 'center' },
  amount: { fontSize: 44, fontWeight: '300', color: W.text },
  muted: { color: W.muted, fontSize: 13 },
  bar: { height: 12, backgroundColor: W.soft, borderRadius: 6, width: '100%', marginTop: 14, overflow: 'hidden' },
  barFill: { height: 12, backgroundColor: W.accent, borderRadius: 6 },
  drinks: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  drink: { flex: 1, backgroundColor: W.card, borderRadius: 16, paddingVertical: 14, marginHorizontal: 4, alignItems: 'center' },
  drinkLabel: { fontWeight: '700', color: W.text, marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  input: { backgroundColor: W.card, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, color: W.text, borderWidth: 1, borderColor: W.soft },
  btn: { backgroundColor: W.accent, borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 10 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  section: { fontSize: 17, fontWeight: '700', color: W.text, marginTop: 22, marginBottom: 10 },
  chart: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 120, backgroundColor: W.card, borderRadius: 16, padding: 12 },
  col: { alignItems: 'center', flex: 1 },
  colBar: { width: 18, backgroundColor: W.accent, borderRadius: 6 },
  colLabel: { fontSize: 12, color: W.muted, marginTop: 4 },
  label: { fontSize: 14, fontWeight: '600', color: W.text, marginTop: 16, marginBottom: 6 },
  hint: { color: W.muted, fontSize: 13, marginTop: 16, lineHeight: 19 },
});
