import { useState } from 'react';
import { Alert, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ageAtNextBirthday, daysUntilBirthday, isValidDate } from '@/covers/calendar';
import { plural } from '@/ui/format';
import { Icon, Info } from '@/ui/kit';

import { Backdrop, Hero, HeroBtn, tint } from './decor';
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

// Each person gets their own party colour.
const AVATARS = ['#F06292', '#FFB300', '#4FC3F7', '#9575CD', '#81C784', '#FF8A65'];
const PARTY = ['#F06292', '#FFB300', '#4FC3F7', '#9575CD'];

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
  const [byName, setByName] = usePersisted<boolean>('urodziny.byName', false);
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

  const next = [...people].map((p) => ({ p, days: daysUntilBirthday(p.day, p.month, today) })).sort((a, b) => a.days - b.days)[0];
  const sorted = [...people]
    .map((p) => ({ p, days: daysUntilBirthday(p.day, p.month, today) }))
    .sort((a, b) => (byName ? a.p.name.localeCompare(b.p.name) : a.days - b.days || a.p.name.localeCompare(b.p.name)));

  return (
    <SafeAreaView style={st.screen} edges={[]}>
      <Backdrop icons={['balloon-outline', 'gift-outline', 'sparkles-outline', 'star-outline', 'musical-notes-outline']} colors={PARTY} />
      <Hero
        color={U.accent}
        title="Urodziny"
        icons={['balloon-outline', 'gift-outline', 'sparkles-outline', 'star-outline']}
        right={
          <>
            <Info text="Dodaj bliskich, a zobaczysz, ile zostało do ich urodzin." color="#fff" />
            <HeroBtn icon={byName ? 'text-outline' : 'calendar-outline'} label={byName ? 'Sortuj według daty' : 'Sortuj alfabetycznie'} onPress={() => setByName(!byName)} />
          </>
        }
      >
        {next ? (
          <Pressable onPress={() => setScreen({ name: 'person', id: next.p.id })} style={st.next}>
            <View style={[st.avatar, { backgroundColor: tint(next.p.name, AVATARS), borderWidth: 2, borderColor: '#fff' }]}>
              <Text style={st.avatarText}>{next.p.name.slice(0, 1).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.nextName}>{next.p.name}</Text>
              <Text style={st.nextWhen}>{whenLabel(next.days)}</Text>
            </View>
            <Icon name={next.days === 0 ? 'gift' : 'balloon'} size={30} color="#fff" />
          </Pressable>
        ) : null}
      </Hero>
      <FlatList
        data={sorted}
        keyExtractor={(x) => x.p.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 50, gap: 8 }}>
            <Icon name="gift-outline" size={44} color={U.border} />
            <Text style={st.empty}>Brak osób</Text>
          </View>
        }
        renderItem={({ item: { p, days } }) => (
          <Pressable onPress={() => setScreen({ name: 'person', id: p.id })} style={[st.card, days === 0 && st.today]}>
            <View style={[st.avatar, { backgroundColor: tint(p.name, AVATARS) }]}>
              <Text style={st.avatarText}>{p.name.slice(0, 1).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.name}>{p.name}</Text>
              <Text style={st.muted}>{dateLabel({ day: p.day, month: p.month })}</Text>
            </View>
            {days === 0 ? <Icon name="gift" size={18} color={U.accent} /> : null}
            <Text style={[st.when, days <= 7 && st.soon]}>{whenLabel(days)}</Text>
          </Pressable>
        )}
      />
      <Pressable accessibilityRole="button" accessibilityLabel="Dodaj osobę" style={st.fab} onPress={() => setScreen({ name: 'add' })}>
        <Icon name="person-add" size={24} color="#fff" />
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
      <View style={[st.topBar, st.bar]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Wróć" onPress={props.onBack} hitSlop={10}>
          <Icon name="chevron-back" size={26} color={U.accent} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Usuń z listy"
          hitSlop={10}
          onPress={() =>
            Alert.alert(`Usunąć: ${person.name}?`, undefined, [
              { text: 'Anuluj', style: 'cancel' },
              { text: 'Usuń', style: 'destructive', onPress: props.onDelete },
            ])
          }
        >
          <Icon name="trash-outline" size={22} color={U.muted} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        <Text style={st.h1Detail}>{person.name}</Text>
        <Text style={st.muted}>{dateLabel(person)}</Text>
        <View style={[st.countdown, { backgroundColor: tint(person.name, AVATARS) + '22' }]}>
          <Icon name={days === 0 ? 'gift' : 'balloon-outline'} size={30} color={tint(person.name, AVATARS)} />
          <Text style={st.countdownBig}>{whenLabel(days)}</Text>
          {age !== null ? (
            <Text style={st.muted}>
              {days === 0 ? 'kończy' : 'skończy'} {age} {plural(age, 'rok', 'lata', 'lat')}
            </Text>
          ) : null}
        </View>

        <View style={st.labelRow}>
          <Icon name="gift-outline" size={18} color={U.text} />
          <Text style={[st.label, { marginTop: 0, marginBottom: 0 }]}>Prezent</Text>
        </View>
        <TextInput
          {...secretSafeInput}
          multiline
          value={gift}
          onChangeText={(t) => {
            setGift(t);
            setSaved(false);
          }}
          placeholder="książka, perfumy, kubek"
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
          {saved ? <Icon name="checkmark" size={22} color="#fff" /> : <Text style={st.btnText}>Zapisz</Text>}
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
        <Pressable accessibilityRole="button" accessibilityLabel="Anuluj" onPress={onCancel} hitSlop={10}>
          <Icon name="close" size={26} color={U.accent} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Zapisz" onPress={save} hitSlop={10}>
          <Icon name="checkmark" size={26} color={U.accent} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        <Text style={st.h1Detail}>Nowa osoba</Text>
        <TextInput {...secretSafeInput} value={name} onChangeText={setName} placeholder="Imię" placeholderTextColor={U.muted} style={[st.input, { marginTop: 14 }]} />
        <View style={[st.labelRow, { marginTop: 14 }]}>
          <Icon name="calendar-outline" size={18} color={U.text} />
          <Text style={[st.label, { marginTop: 0, marginBottom: 0 }]}>Data urodzin</Text>
          <Info text="Rok możesz pominąć." color={U.muted} />
        </View>
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
  bar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, marginBottom: 6 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: U.soft, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { fontSize: 17, fontWeight: '700', color: '#fff' },
  next: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14, padding: 12, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.18)' },
  nextName: { fontSize: 18, fontWeight: '800', color: '#fff' },
  nextWhen: { fontSize: 14, color: '#FFE6EF', marginTop: 1 },
  sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: U.card, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: U.border },
  soon: { color: '#fff', backgroundColor: U.accent, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, overflow: 'hidden' },
  link: { color: U.accent, fontSize: 17 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: U.card, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: U.border },
  today: { borderColor: U.accent, borderWidth: 2 },
  name: { fontSize: 17, fontWeight: '700', color: U.text, marginBottom: 2 },
  muted: { color: U.muted, fontSize: 14 },
  when: { fontSize: 15, fontWeight: '600', color: U.text, marginLeft: 8 },
  empty: { textAlign: 'center', color: U.muted },
  fab: { position: 'absolute', right: 16, bottom: 28, backgroundColor: U.accent, width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', elevation: 4 },
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
