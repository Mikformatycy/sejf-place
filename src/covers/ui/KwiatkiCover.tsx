import { useRef, useState } from 'react';
import { Alert, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { daysUntilWatering, localDayKey } from '@/covers/calendar';
import { joinSequence, SEQUENCE_STEPS } from '@/covers/sequence';

import { newId, secretSafeInput, usePersisted, useStepRecorder, type CoverProps } from './shared';

interface Plant {
  id: string;
  name: string;
  everyDays: number;
  /** "YYYY-MM-DD" */
  lastWatered: string;
  note?: string;
}

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return localDayKey(d);
};

// Typical houseplants, watered at different times, so the list looks lived-in.
const SAMPLE: Plant[] = [
  { id: 'monstera', name: 'Monstera', everyDays: 7, lastWatered: daysAgo(5) },
  { id: 'storczyk', name: 'Storczyk', everyDays: 10, lastWatered: daysAgo(3) },
  { id: 'bazylia', name: 'Bazylia', everyDays: 2, lastWatered: daysAgo(2) },
  { id: 'fikus', name: 'Fikus', everyDays: 5, lastWatered: daysAgo(6) },
  { id: 'aloes', name: 'Aloes', everyDays: 14, lastWatered: daysAgo(4) },
  { id: 'paproc', name: 'Paproć', everyDays: 3, lastWatered: daysAgo(1) },
];

const K = { bg: '#F2F7EF', card: '#FFFFFF', text: '#22351F', muted: '#6E806A', accent: '#3E8E41', soft: '#E0EEDC', border: '#D7E5D2', late: '#C0582B' };

function status(days: number): { text: string; color: string } {
  if (days < 0) return { text: `po terminie ${-days} ${-days === 1 ? 'dzień' : 'dni'}`, color: K.late };
  if (days === 0) return { text: 'podlać dziś', color: K.accent };
  if (days === 1) return { text: 'jutro', color: K.muted };
  return { text: `za ${days} dni`, color: K.muted };
}

const digits = (s: string) => s.replace(/\D/g, '').slice(0, 3);

type Screen = { name: 'list' } | { name: 'plant'; id: string } | { name: 'add' };

export default function KwiatkiCover({ check }: CoverProps) {
  const [plants, setPlants, loaded] = usePersisted<Plant[]>('kwiatki.plants', SAMPLE);
  const [screen, setScreen] = useState<Screen>({ name: 'list' });
  const today = new Date();

  // Watering taps form a sequence key; if it unlocks, undo the taps.
  const snapshot = useRef<Plant[] | null>(null);
  const seq = useStepRecorder(async (steps, final, stop) => {
    const before = snapshot.current;
    if (final) snapshot.current = null;
    if (steps.length >= 2 && (await check('waterSeq', joinSequence(steps), undefined, { partial: !final }))) {
      stop();
      snapshot.current = null;
      if (before) setPlants(before);
    }
  }, SEQUENCE_STEPS);

  const water = (p: Plant) => {
    if (!snapshot.current) snapshot.current = plants;
    seq.push(p.id);
    setPlants((all) => all.map((x) => (x.id === p.id ? { ...x, lastWatered: localDayKey(new Date()) } : x)));
  };

  if (!loaded) return <View style={{ flex: 1, backgroundColor: K.bg }} />;

  if (screen.name === 'add') {
    return (
      <AddPlant
        check={check}
        onCancel={() => setScreen({ name: 'list' })}
        onSave={(p) => {
          setPlants((all) => [...all, p]);
          setScreen({ name: 'list' });
        }}
      />
    );
  }

  if (screen.name === 'plant') {
    const plant = plants.find((p) => p.id === screen.id);
    if (plant) {
      return (
        <PlantView
          plant={plant}
          check={check}
          onBack={() => setScreen({ name: 'list' })}
          onUpdate={(change) => setPlants((all) => all.map((x) => (x.id === plant.id ? { ...x, ...change } : x)))}
          onDelete={() => {
            setPlants((all) => all.filter((x) => x.id !== plant.id));
            setScreen({ name: 'list' });
          }}
        />
      );
    }
  }

  const sorted = plants
    .map((p) => ({ p, days: daysUntilWatering(p.lastWatered, p.everyDays, today) }))
    .sort((a, b) => a.days - b.days || a.p.name.localeCompare(b.p.name));
  const due = sorted.filter((x) => x.days <= 0).length;

  return (
    <SafeAreaView style={st.screen} edges={['top']}>
      <Text style={st.h1}>Moje kwiatki</Text>
      <Text style={[st.muted, { paddingHorizontal: 16 }]}>{due === 0 ? 'Wszystkie podlane.' : `Do podlania dziś: ${due}`}</Text>
      <FlatList
        data={sorted}
        keyExtractor={(x) => x.p.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        ListEmptyComponent={<Text style={st.empty}>Dodaj pierwszą roślinę.</Text>}
        renderItem={({ item: { p, days } }) => {
          const s = status(days);
          return (
            <Pressable onPress={() => setScreen({ name: 'plant', id: p.id })} style={st.card}>
              <View style={{ flex: 1 }}>
                <Text style={st.name}>{p.name}</Text>
                <Text style={[st.status, { color: s.color }]}>{s.text}</Text>
              </View>
              <Pressable onPress={() => water(p)} hitSlop={6} style={[st.waterBtn, days > 0 && st.waterBtnIdle]}>
                <Text style={[st.waterText, days > 0 && { color: K.accent }]}>Podlane</Text>
              </Pressable>
            </Pressable>
          );
        }}
      />
      <Pressable style={st.fab} onPress={() => setScreen({ name: 'add' })}>
        <Text style={st.fabText}>+ Dodaj roślinę</Text>
      </Pressable>
    </SafeAreaView>
  );
}

function PlantView(props: {
  plant: Plant;
  check: CoverProps['check'];
  onBack: () => void;
  onUpdate: (change: Partial<Plant>) => void;
  onDelete: () => void;
}) {
  const { plant } = props;
  const [every, setEvery] = useState(String(plant.everyDays));
  const [note, setNote] = useState(plant.note ?? '');
  const [noteSaved, setNoteSaved] = useState(false);
  const [y, m, d] = plant.lastWatered.split('-');

  return (
    <SafeAreaView style={st.screen} edges={['top']}>
      <Pressable onPress={props.onBack} hitSlop={10} style={st.topBar}>
        <Text style={st.link}>‹ Kwiatki</Text>
      </Pressable>
      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        <Text style={st.h1Detail}>{plant.name}</Text>
        <Text style={st.muted}>
          Ostatnio podlana: {Number(d)}.{m}.{y}
        </Text>

        <Text style={st.label}>Podlewaj co (dni)</Text>
        <View style={{ flexDirection: 'row' }}>
          <TextInput keyboardType="number-pad" value={every} onChangeText={(v) => setEvery(digits(v))} style={[st.input, { flex: 1 }]} />
          <Pressable
            style={[st.btn, st.btnInline]}
            onPress={() => {
              const n = Math.min(60, Math.max(1, Number(every) || plant.everyDays));
              setEvery(String(n));
              props.onUpdate({ everyDays: n });
            }}
          >
            <Text style={st.btnText}>Zapisz</Text>
          </Pressable>
        </View>

        <Text style={st.label}>Notatka</Text>
        <TextInput
          {...secretSafeInput}
          multiline
          value={note}
          onChangeText={(t) => {
            setNote(t);
            setNoteSaved(false);
          }}
          placeholder="np. lubi półcień, nawozić od maja"
          placeholderTextColor={K.muted}
          style={[st.input, { minHeight: 80, textAlignVertical: 'top' }]}
        />
        <Pressable
          style={st.btn}
          onPress={async () => {
            if (note.trim() && (await props.check('note', note, plant.id))) {
              setNote(plant.note ?? '');
              return;
            }
            props.onUpdate({ note });
            setNoteSaved(true);
          }}
        >
          <Text style={st.btnText}>{noteSaved ? 'Zapisano ✓' : 'Zapisz notatkę'}</Text>
        </Pressable>
        <Pressable
          style={[st.btn, { backgroundColor: 'transparent' }]}
          onPress={() =>
            Alert.alert(`Usunąć: ${plant.name}?`, undefined, [
              { text: 'Anuluj', style: 'cancel' },
              { text: 'Usuń', style: 'destructive', onPress: props.onDelete },
            ])
          }
        >
          <Text style={[st.btnText, { color: K.muted }]}>Usuń roślinę</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function AddPlant({ check, onCancel, onSave }: { check: CoverProps['check']; onCancel: () => void; onSave: (p: Plant) => void }) {
  const [name, setName] = useState('');
  const [every, setEvery] = useState('7');

  const save = async () => {
    if (!name.trim()) return;
    if (await check('addPlant', name)) {
      onCancel();
      return;
    }
    const n = Math.min(60, Math.max(1, Number(every) || 7));
    onSave({ id: newId(), name: name.trim(), everyDays: n, lastWatered: localDayKey(new Date()) });
  };

  return (
    <SafeAreaView style={st.screen} edges={['top']}>
      <View style={[st.topBar, { flexDirection: 'row', justifyContent: 'space-between' }]}>
        <Pressable onPress={onCancel} hitSlop={10}>
          <Text style={st.link}>‹ Anuluj</Text>
        </Pressable>
        <Pressable onPress={save} hitSlop={10}>
          <Text style={[st.link, { fontWeight: '700' }]}>Zapisz</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        <Text style={st.h1Detail}>Nowa roślina</Text>
        <Text style={st.label}>Nazwa</Text>
        <TextInput {...secretSafeInput} value={name} onChangeText={setName} placeholder="np. Zamiokulkas" placeholderTextColor={K.muted} style={st.input} />
        <Text style={st.label}>Podlewaj co (dni)</Text>
        <TextInput keyboardType="number-pad" value={every} onChangeText={(v) => setEvery(digits(v))} style={st.input} />
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: K.bg },
  h1: { fontSize: 28, fontWeight: '800', color: K.text, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 2 },
  h1Detail: { fontSize: 26, fontWeight: '800', color: K.text, marginBottom: 2 },
  topBar: { paddingHorizontal: 16, paddingVertical: 10 },
  link: { color: K.accent, fontSize: 17 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: K.card, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: K.border },
  name: { fontSize: 17, fontWeight: '700', color: K.text, marginBottom: 2 },
  status: { fontSize: 14 },
  muted: { color: K.muted, fontSize: 14 },
  empty: { textAlign: 'center', color: K.muted, marginTop: 40 },
  waterBtn: { backgroundColor: K.accent, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8, marginLeft: 8 },
  waterBtnIdle: { backgroundColor: K.soft },
  waterText: { color: '#fff', fontWeight: '700' },
  fab: { position: 'absolute', right: 16, bottom: 28, backgroundColor: K.accent, borderRadius: 26, paddingHorizontal: 20, paddingVertical: 14, elevation: 4 },
  fabText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  label: { fontSize: 14, fontWeight: '600', color: K.text, marginTop: 16, marginBottom: 6 },
  input: { backgroundColor: K.card, borderRadius: 12, borderWidth: 1, borderColor: K.border, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, color: K.text },
  btn: { backgroundColor: K.accent, borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 10 },
  btnInline: { marginTop: 0, marginLeft: 8, paddingHorizontal: 18 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
