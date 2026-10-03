import { useRef, useState } from 'react';
import { Alert, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { daysUntilWatering, localDayKey } from '@/covers/calendar';
import { joinSequence, SEQUENCE_STEPS } from '@/covers/sequence';
import { Icon, Info } from '@/ui/kit';

import { Backdrop, Hero, HeroBtn, tint } from './decor';
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

// Every plant gets its own little icon and colour: leaves, flowers, roses.
const PLANT_ICONS = ['leaf', 'flower', 'rose', 'leaf-outline', 'flower-outline'] as const;
const PLANT_COLORS = ['#3E8E41', '#E57399', '#8E6CC8', '#2E9E8F', '#D9822B'];

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
  const [byName, setByName] = usePersisted<boolean>('kwiatki.byName', false);
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
    .sort((a, b) => (byName ? a.p.name.localeCompare(b.p.name) : a.days - b.days || a.p.name.localeCompare(b.p.name)));
  const thirsty = sorted.filter((x) => x.days <= 0);

  return (
    <SafeAreaView style={st.screen} edges={[]}>
      <Backdrop icons={['leaf-outline', 'flower-outline', 'rose-outline', 'sunny-outline']} colors={PLANT_COLORS} />
      <Hero
        color={K.accent}
        title="Moje kwiatki"
        icons={['leaf-outline', 'flower-outline', 'rose-outline', 'sunny-outline']}
        right={
          <>
            <Info text="Stuknij kroplę, gdy podlejesz roślinę." color="#fff" />
            <HeroBtn icon={byName ? 'text-outline' : 'time-outline'} label={byName ? 'Sortuj według podlewania' : 'Sortuj alfabetycznie'} onPress={() => setByName(!byName)} />
          </>
        }
      >
        {/* Who is thirsty today; a sun when everyone has had water. */}
        <View style={st.thirsty}>
          {thirsty.length === 0 ? (
            <View style={st.thirstyItem}>
              <Icon name="sunny" size={22} color="#FFE082" />
              <Icon name="checkmark-done" size={20} color="#fff" />
            </View>
          ) : (
            thirsty.map(({ p }) => (
              <Pressable key={p.id} onPress={() => setScreen({ name: 'plant', id: p.id })} style={st.thirstyItem}>
                <Icon name={tint(p.name, PLANT_ICONS)} size={18} color="#fff" />
                <Text style={st.thirstyText}>{p.name}</Text>
                <Icon name="water" size={14} color="#B3E5FC" />
              </Pressable>
            ))
          )}
        </View>
      </Hero>
      <FlatList
        data={sorted}
        keyExtractor={(x) => x.p.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 50, gap: 8 }}>
            <Icon name="leaf-outline" size={44} color={K.border} />
            <Text style={st.empty}>Brak roślin</Text>
          </View>
        }
        renderItem={({ item: { p, days } }) => {
          const s = status(days);
          return (
            <Pressable onPress={() => setScreen({ name: 'plant', id: p.id })} style={st.card}>
              <View style={[st.plantIcon, { backgroundColor: tint(p.name, PLANT_COLORS) + '22' }]}>
                <Icon name={tint(p.name, PLANT_ICONS)} size={20} color={tint(p.name, PLANT_COLORS)} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={st.name}>{p.name}</Text>
                <Text style={[st.status, { color: s.color }]}>{s.text}</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel={`Podlane: ${p.name}`} onPress={() => water(p)} hitSlop={6} style={[st.waterBtn, days > 0 && st.waterBtnIdle]}>
                <Icon name="water" size={20} color={days > 0 ? K.accent : '#fff'} />
              </Pressable>
            </Pressable>
          );
        }}
      />
      <Pressable accessibilityRole="button" accessibilityLabel="Dodaj roślinę" style={st.fab} onPress={() => setScreen({ name: 'add' })}>
        <Icon name="add" size={28} color="#fff" />
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
      <View style={[st.topBar, st.bar]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Wróć" onPress={props.onBack} hitSlop={10}>
          <Icon name="chevron-back" size={26} color={K.accent} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Usuń roślinę"
          hitSlop={10}
          onPress={() =>
            Alert.alert(`Usunąć: ${plant.name}?`, undefined, [
              { text: 'Anuluj', style: 'cancel' },
              { text: 'Usuń', style: 'destructive', onPress: props.onDelete },
            ])
          }
        >
          <Icon name="trash-outline" size={22} color={K.muted} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        <Text style={st.h1Detail}>{plant.name}</Text>
        <View style={st.labelRow}>
          <Icon name="water-outline" size={16} color={K.muted} />
          <Text style={st.muted}>
            {Number(d)}.{m}.{y}
          </Text>
        </View>

        <View style={st.labelRow}>
          <Icon name="repeat" size={18} color={K.text} />
          <Text style={[st.label, st.labelInline]}>Co ile dni</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TextInput keyboardType="number-pad" value={every} onChangeText={(v) => setEvery(digits(v))} style={[st.input, { flex: 1 }]} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Zapisz"
            style={[st.btn, st.round]}
            onPress={() => {
              const n = Math.min(60, Math.max(1, Number(every) || plant.everyDays));
              setEvery(String(n));
              props.onUpdate({ everyDays: n });
            }}
          >
            <Icon name="checkmark" size={22} color="#fff" />
          </Pressable>
        </View>

        <View style={st.labelRow}>
          <Icon name="create-outline" size={18} color={K.text} />
          <Text style={[st.label, st.labelInline]}>Notatka</Text>
        </View>
        <TextInput
          {...secretSafeInput}
          multiline
          value={note}
          onChangeText={(t) => {
            setNote(t);
            setNoteSaved(false);
          }}
          placeholder="lubi półcień, nawozić od maja"
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
          {noteSaved ? <Icon name="checkmark" size={22} color="#fff" /> : <Text style={st.btnText}>Zapisz</Text>}
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
        <Pressable accessibilityRole="button" accessibilityLabel="Anuluj" onPress={onCancel} hitSlop={10}>
          <Icon name="close" size={26} color={K.accent} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Zapisz" onPress={save} hitSlop={10}>
          <Icon name="checkmark" size={26} color={K.accent} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        <Text style={st.h1Detail}>Nowa roślina</Text>
        <TextInput {...secretSafeInput} value={name} onChangeText={setName} placeholder="Nazwa" placeholderTextColor={K.muted} style={[st.input, { marginTop: 14 }]} />
        <View style={st.labelRow}>
          <Icon name="repeat" size={18} color={K.text} />
          <Text style={[st.label, st.labelInline]}>Co ile dni</Text>
        </View>
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
  bar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 2 },
  thirsty: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  thirstyItem: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6 },
  thirstyText: { color: '#fff', fontWeight: '700' },
  sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: K.card, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: K.border, marginRight: 8 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: K.soft, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5 },
  badgeText: { fontSize: 14, fontWeight: '700', color: K.accent },
  plantIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: K.soft, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16, marginBottom: 6 },
  labelInline: { marginTop: 0, marginBottom: 0 },
  round: { width: 46, height: 46, borderRadius: 23, marginTop: 0, marginLeft: 8, paddingVertical: 0, justifyContent: 'center' },
  link: { color: K.accent, fontSize: 17 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: K.card, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: K.border },
  name: { fontSize: 17, fontWeight: '700', color: K.text, marginBottom: 2 },
  status: { fontSize: 14 },
  muted: { color: K.muted, fontSize: 14 },
  empty: { textAlign: 'center', color: K.muted, marginTop: 40 },
  waterBtn: { backgroundColor: K.accent, width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  waterBtnIdle: { backgroundColor: K.soft },
  fab: { position: 'absolute', right: 16, bottom: 28, backgroundColor: K.accent, width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', elevation: 4 },
  label: { fontSize: 14, fontWeight: '600', color: K.text, marginTop: 16, marginBottom: 6 },
  input: { backgroundColor: K.card, borderRadius: 12, borderWidth: 1, borderColor: K.border, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, color: K.text },
  btn: { backgroundColor: K.accent, borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 10 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
