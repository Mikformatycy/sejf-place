import { useState } from 'react';
import { Alert, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ageAtNextBirthday, daysUntilBirthday, isValidDate } from '@/covers/calendar';
import { plural } from '@/ui/format';

import { newId, secretSafeInput, usePersisted, type CoverProps } from './shared';

interface Person {
  id: string;
  name: string;
  day: number;
  month: number;
  year?: number;
  gift?: string;
}

const U = { bg: '#FFF6F8', card: '#FFFFFF', text: '#3B2230', muted: '#8C6B7A', accent: '#D6457A', soft: '#FBE3EC', border: '#F1D5E0' };

const MONTHS = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];

const dateLabel = (p: Pick<Person, 'day' | 'month' | 'year'>) => `${p.day} ${MONTHS[p.month - 1]}${p.year ? ` ${p.year}` : ''}`;

function whenLabel(days: number): string {
  if (days === 0) return 'dziś!';
  if (days === 1) return 'jutro';
  return `za ${days} dni`;
}

const digits = (s: string, max: number) => s.replace(/\D/g, '').slice(0, max);
const pad = (s: string) => s.padStart(2, '0');

type Screen = { name: 'list' } | { name: 'person'; id: string } | { name: 'add' };

export default function UrodzinyCover({ check }: CoverProps) {
  const [people, setPeople, loaded] = usePersisted<Person[]>('urodziny.people', []);
  const [screen, setScreen] = useState<Screen>({ name: 'list' });
  const today = new Date();

  if (!loaded) return <View style={{ flex: 1, backgroundColor: U.bg }} />;

  if (screen.name === 'add') {
    return (
      <AddPerson
        check={check}
        onCancel={() => setScreen({ name: 'list' })}
        onSave={(p) => {
          setPeople((all) => [...all, p]);
          setScreen({ name: 'list' });
        }}
      />
    );
  }

  if (screen.name === 'person') {
    const person = people.find((p) => p.id === screen.id);
    if (person) {
      return (
        <PersonView
          person={person}
          check={check}
          onBack={() => setScreen({ name: 'list' })}
          onSaveGift={(gift) => setPeople((all) => all.map((p) => (p.id === person.id ? { ...p, gift } : p)))}
          onDelete={() => {
            setPeople((all) => all.filter((p) => p.id !== person.id));
            setScreen({ name: 'list' });
          }}
        />
      );
    }
  }

  const sorted = [...people]
    .map((p) => ({ p, days: daysUntilBirthday(p.day, p.month, today) }))
    .sort((a, b) => a.days - b.days || a.p.name.localeCompare(b.p.name));

  return (
    <SafeAreaView style={st.screen} edges={['top']}>
      <Text style={st.h1}>Urodziny</Text>
      <FlatList
        data={sorted}
        keyExtractor={(x) => x.p.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        ListEmptyComponent={<Text style={st.empty}>Nie masz jeszcze nikogo na liście. Dodaj bliskich, a przypomnimy o ich urodzinach.</Text>}
        renderItem={({ item: { p, days } }) => (
          <Pressable onPress={() => setScreen({ name: 'person', id: p.id })} style={[st.card, days === 0 && st.today]}>
            <View style={{ flex: 1 }}>
              <Text style={st.name}>{p.name}</Text>
              <Text style={st.muted}>{dateLabel({ day: p.day, month: p.month })}</Text>
            </View>
            <Text style={[st.when, days <= 7 && { color: U.accent }]}>{whenLabel(days)}</Text>
          </Pressable>
        )}
      />
      <Pressable style={st.fab} onPress={() => setScreen({ name: 'add' })}>
        <Text style={st.fabText}>+ Dodaj osobę</Text>
      </Pressable>
    </SafeAreaView>
  );
}

function PersonView(props: {
  person: Person;
  check: CoverProps['check'];
  onBack: () => void;
  onSaveGift: (gift: string) => void;
  onDelete: () => void;
}) {
  const { person } = props;
  const [gift, setGift] = useState(person.gift ?? '');
  const [saved, setSaved] = useState(false);
  const today = new Date();
  const days = daysUntilBirthday(person.day, person.month, today);
  const age = ageAtNextBirthday(person.day, person.month, person.year, today);

  return (
    <SafeAreaView style={st.screen} edges={['top']}>
      <Pressable onPress={props.onBack} hitSlop={10} style={st.topBar}>
        <Text style={st.link}>‹ Urodziny</Text>
      </Pressable>
      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        <Text style={st.h1Detail}>{person.name}</Text>
        <Text style={st.muted}>{dateLabel(person)}</Text>
        <View style={st.countdown}>
          <Text style={st.countdownBig}>{whenLabel(days)}</Text>
          {age !== null ? (
            <Text style={st.muted}>
              {days === 0 ? 'kończy' : 'skończy'} {age} {plural(age, 'rok', 'lata', 'lat')}
            </Text>
          ) : null}
        </View>

        <Text style={st.label}>Pomysł na prezent</Text>
        <TextInput
          {...secretSafeInput}
          multiline
          value={gift}
          onChangeText={(t) => {
            setGift(t);
            setSaved(false);
          }}
          placeholder="np. książka, perfumy, kubek"
          placeholderTextColor={U.muted}
          style={[st.input, { minHeight: 80, textAlignVertical: 'top' }]}
        />
        <Pressable
          style={st.btn}
          onPress={async () => {
            if (gift.trim() && (await props.check('gift', gift))) {
              setGift(person.gift ?? '');
              return;
            }
            props.onSaveGift(gift);
            setSaved(true);
          }}
        >
          <Text style={st.btnText}>{saved ? 'Zapisano ✓' : 'Zapisz'}</Text>
        </Pressable>
        <Pressable
          style={[st.btn, { backgroundColor: 'transparent' }]}
          onPress={() =>
            Alert.alert(`Usunąć: ${person.name}?`, undefined, [
              { text: 'Anuluj', style: 'cancel' },
              { text: 'Usuń', style: 'destructive', onPress: props.onDelete },
            ])
          }
        >
          <Text style={[st.btnText, { color: U.muted }]}>Usuń z listy</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function AddPerson({ check, onCancel, onSave }: { check: CoverProps['check']; onCancel: () => void; onSave: (p: Person) => void }) {
  const [name, setName] = useState('');
  const [d, setD] = useState('');
  const [m, setM] = useState('');
  const [y, setY] = useState('');
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!name.trim()) return;
    const unlocked = (await check('addPerson', name)) || (d && m ? await check('addDate', `${pad(d)}${pad(m)}${y}`) : false);
    if (unlocked) {
      onCancel();
      return;
    }
    const day = Number(d);
    const month = Number(m);
    const year = y ? Number(y) : undefined;
    const thisYear = new Date().getFullYear();
    if (!isValidDate(day, month, year) || (year !== undefined && (year < 1900 || year > thisYear))) {
      setError('Sprawdź datę urodzin.');
      return;
    }
    onSave({ id: newId(), name: name.trim(), day, month, ...(year ? { year } : {}) });
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
        <Text style={st.h1Detail}>Nowa osoba</Text>
        <Text style={st.label}>Imię</Text>
        <TextInput {...secretSafeInput} value={name} onChangeText={setName} placeholder="np. Kasia" placeholderTextColor={U.muted} style={st.input} />
        <Text style={st.label}>Data urodzin (rok nieobowiązkowy)</Text>
        <View style={st.dateRow}>
          <TextInput keyboardType="number-pad" value={d} onChangeText={(v) => setD(digits(v, 2))} placeholder="DD" placeholderTextColor={U.muted} style={[st.input, st.dateInput]} />
          <Text style={st.sep}>.</Text>
          <TextInput keyboardType="number-pad" value={m} onChangeText={(v) => setM(digits(v, 2))} placeholder="MM" placeholderTextColor={U.muted} style={[st.input, st.dateInput]} />
          <Text style={st.sep}>.</Text>
          <TextInput keyboardType="number-pad" value={y} onChangeText={(v) => setY(digits(v, 4))} placeholder="RRRR" placeholderTextColor={U.muted} style={[st.input, st.dateInput, { width: 84 }]} />
        </View>
        {error ? <Text style={st.error}>{error}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: U.bg },
  h1: { fontSize: 28, fontWeight: '800', color: U.text, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  h1Detail: { fontSize: 26, fontWeight: '800', color: U.text, marginBottom: 2 },
  topBar: { paddingHorizontal: 16, paddingVertical: 10 },
  link: { color: U.accent, fontSize: 17 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: U.card, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: U.border },
  today: { borderColor: U.accent, borderWidth: 2 },
  name: { fontSize: 17, fontWeight: '700', color: U.text, marginBottom: 2 },
  muted: { color: U.muted, fontSize: 14 },
  when: { fontSize: 15, fontWeight: '600', color: U.text, marginLeft: 8 },
  empty: { textAlign: 'center', color: U.muted, marginTop: 40, paddingHorizontal: 20, lineHeight: 21 },
  fab: { position: 'absolute', right: 16, bottom: 28, backgroundColor: U.accent, borderRadius: 26, paddingHorizontal: 20, paddingVertical: 14, elevation: 4 },
  fabText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  countdown: { backgroundColor: U.soft, borderRadius: 16, padding: 18, alignItems: 'center', marginVertical: 16 },
  countdownBig: { fontSize: 30, fontWeight: '800', color: U.accent },
  label: { fontSize: 14, fontWeight: '600', color: U.text, marginTop: 14, marginBottom: 6 },
  input: { backgroundColor: U.card, borderRadius: 12, borderWidth: 1, borderColor: U.border, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, color: U.text },
  dateRow: { flexDirection: 'row', alignItems: 'center' },
  dateInput: { width: 56, textAlign: 'center' },
  sep: { fontSize: 18, color: U.muted, marginHorizontal: 6 },
  btn: { backgroundColor: U.accent, borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 10 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  error: { color: '#C62828', marginTop: 10 },
});
