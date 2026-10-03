import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon, Info, type IconName } from '@/ui/kit';

import { Backdrop, Hero, tint } from './decor';
import { newId, secretSafeInput, usePersisted, type CoverProps } from './shared';

interface Book {
  id: string;
  title: string;
  author: string;
  pages: number;
  current: number;
  notes?: string;
}

// A few books so the cover looks like an app in use.
const SAMPLE: Book[] = [
  { id: 'lalka', title: 'Lalka', author: 'Bolesław Prus', pages: 680, current: 212 },
  { id: 'chlopki', title: 'Chłopki', author: 'Joanna Kuciel-Frydryszak', pages: 448, current: 448 },
  { id: 'empuzjon', title: 'Empuzjon', author: 'Olga Tokarczuk', pages: 400, current: 0 },
];

const B = { bg: '#F7F4EE', card: '#FFFFFF', text: '#2E2A24', muted: '#857B6C', accent: '#2F7D6B', soft: '#E3EFEA', border: '#E6DFD2' };

// Book spines in warm library colours; the same title always gets the same one.
const SPINES = ['#2F7D6B', '#C0582B', '#5C6BC0', '#AD1457', '#F9A825', '#00838F', '#6D4C41'];
const SECTION_COLOR = ['#2F7D6B', '#F9A825', '#5C6BC0'];

const percent = (b: Book) => Math.round((Math.min(b.current, b.pages) / b.pages) * 100);
const digits = (s: string, max = 6) => s.replace(/\D/g, '').slice(0, max);

type Screen = { name: 'list' } | { name: 'book'; id: string } | { name: 'add' };

export default function KsiazkiCover({ check }: CoverProps) {
  const [books, setBooks, loaded] = usePersisted<Book[]>('ksiazki.books', SAMPLE);
  const [screen, setScreen] = useState<Screen>({ name: 'list' });

  if (!loaded) return <View style={{ flex: 1, backgroundColor: B.bg }} />;
  const update = (id: string, change: Partial<Book>) => setBooks((all) => all.map((b) => (b.id === id ? { ...b, ...change } : b)));

  if (screen.name === 'add') {
    return (
      <AddBook
        check={check}
        onCancel={() => setScreen({ name: 'list' })}
        onSave={(b) => {
          setBooks((all) => [b, ...all]);
          setScreen({ name: 'list' });
        }}
      />
    );
  }

  if (screen.name === 'book') {
    const book = books.find((b) => b.id === screen.id);
    if (book) {
      return (
        <BookView
          book={book}
          check={check}
          onBack={() => setScreen({ name: 'list' })}
          onUpdate={(change) => update(book.id, change)}
          onDelete={() => {
            setBooks((all) => all.filter((b) => b.id !== book.id));
            setScreen({ name: 'list' });
          }}
        />
      );
    }
  }

  const reading = books.filter((b) => b.current > 0 && b.current < b.pages);
  const toRead = books.filter((b) => b.current === 0);
  const done = books.filter((b) => b.current >= b.pages);
  const sections: [string, IconName, Book[]][] = [
    ['Czytam', 'book-outline', reading],
    ['Do przeczytania', 'bookmark-outline', toRead],
    ['Przeczytane', 'checkmark-done-outline', done],
  ];

  return (
    <SafeAreaView style={st.screen} edges={[]}>
      <Backdrop icons={['book-outline', 'bookmark-outline', 'library-outline', 'cafe-outline']} colors={SPINES} opacity={0.07} />
      <Hero
        color={B.accent}
        title="Czytelniczka"
        icons={['book-outline', 'bookmark-outline', 'library-outline', 'glasses-outline']}
        right={
          <View style={st.trophy}>
            <Icon name="trophy" size={16} color="#FFD54F" />
            <Text style={st.trophyText}>{done.length}</Text>
          </View>
        }
      >
        {/* The books being read now, as covers on a shelf. */}
        {reading.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.shelf}>
            {reading.map((b) => (
              <Pressable key={b.id} onPress={() => setScreen({ name: 'book', id: b.id })} style={st.shelfBook}>
                <View style={[st.bigCover, { backgroundColor: tint(b.title, SPINES) }]}>
                  <Text style={st.bigCoverText} numberOfLines={3}>
                    {b.title}
                  </Text>
                  <View style={st.bigCoverBar}>
                    <View style={[st.bigCoverFill, { width: `${percent(b)}%` }]} />
                  </View>
                </View>
                <Text style={st.shelfPct}>{percent(b)}%</Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}
      </Hero>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {books.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 50, gap: 8 }}>
            <Icon name="library-outline" size={44} color={B.border} />
            <Text style={st.empty}>Brak książek</Text>
          </View>
        ) : null}
        {sections
          .filter(([, , list]) => list.length > 0)
          .map(([title, icon, list], si) => (
            <View key={title}>
              <View style={st.sectionRow}>
                <Icon name={icon} size={16} color={SECTION_COLOR[si]} />
                <Text style={[st.section, { color: SECTION_COLOR[si] }]}>
                  {title} · {list.length}
                </Text>
              </View>
              {list.map((b) => (
                <Pressable key={b.id} onPress={() => setScreen({ name: 'book', id: b.id })} style={st.card}>
                  <View style={[st.cover, { backgroundColor: tint(b.title, SPINES) }]}>
                    <Text style={st.coverText}>{b.title.slice(0, 1).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={st.title}>{b.title}</Text>
                    <Text style={st.muted}>{b.author}</Text>
                    <Progress book={b} />
                  </View>
                </Pressable>
              ))}
            </View>
          ))}
      </ScrollView>
      <Pressable accessibilityRole="button" accessibilityLabel="Dodaj książkę" style={st.fab} onPress={() => setScreen({ name: 'add' })}>
        <Icon name="add" size={28} color="#fff" />
      </Pressable>
    </SafeAreaView>
  );
}

function Progress({ book }: { book: Book }) {
  const p = percent(book);
  return (
    <View style={{ marginTop: 10 }}>
      <View style={st.bar}>
        <View style={[st.barFill, { width: `${p}%` }]} />
      </View>
      <Text style={[st.muted, { marginTop: 4 }]}>
        {Math.min(book.current, book.pages)} / {book.pages} str. · {p}%
      </Text>
    </View>
  );
}

function BookView(props: {
  book: Book;
  check: CoverProps['check'];
  onBack: () => void;
  onUpdate: (change: Partial<Book>) => void;
  onDelete: () => void;
}) {
  const { book } = props;
  const [page, setPage] = useState(String(book.current));
  const [notes, setNotes] = useState(book.notes ?? '');
  const [notesSaved, setNotesSaved] = useState(false);

  const savePage = () => {
    const n = Math.min(book.pages, Number(page) || 0);
    setPage(String(n));
    props.onUpdate({ current: n });
  };

  return (
    <SafeAreaView style={st.screen} edges={['top']}>
      <View style={[st.topBar, st.bar2]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Wróć" onPress={props.onBack} hitSlop={10}>
          <Icon name="chevron-back" size={26} color={B.accent} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Usuń książkę"
          hitSlop={10}
          onPress={() =>
            Alert.alert(`Usunąć „${book.title}”?`, undefined, [
              { text: 'Anuluj', style: 'cancel' },
              { text: 'Usuń', style: 'destructive', onPress: props.onDelete },
            ])
          }
        >
          <Icon name="trash-outline" size={22} color={B.muted} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        <Text style={st.h1Detail}>{book.title}</Text>
        <Text style={st.muted}>{book.author}</Text>
        <Progress book={book} />

        <View style={st.labelRow}>
          <Icon name="bookmark-outline" size={18} color={B.text} />
          <Text style={[st.label, st.labelInline]}>Strona</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TextInput keyboardType="number-pad" value={page} onChangeText={(v) => setPage(digits(v, 5))} style={[st.input, { flex: 1 }]} />
          <Pressable accessibilityRole="button" accessibilityLabel="Zapisz stronę" style={[st.btn, st.round]} onPress={savePage}>
            <Icon name="checkmark" size={22} color="#fff" />
          </Pressable>
          {book.current < book.pages ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Przeczytana"
              style={[st.btn, st.round, { backgroundColor: B.soft }]}
              onPress={() => {
                setPage(String(book.pages));
                props.onUpdate({ current: book.pages });
              }}
            >
              <Icon name="checkmark-done" size={22} color={B.accent} />
            </Pressable>
          ) : null}
        </View>

        <View style={st.labelRow}>
          <Icon name="create-outline" size={18} color={B.text} />
          <Text style={[st.label, st.labelInline]}>Notatki</Text>
        </View>
        <TextInput
          {...secretSafeInput}
          multiline
          value={notes}
          onChangeText={(t) => {
            setNotes(t);
            setNotesSaved(false);
          }}
          placeholder="cytaty, wrażenia"
          placeholderTextColor={B.muted}
          style={[st.input, { minHeight: 90, textAlignVertical: 'top' }]}
        />
        <Pressable
          style={st.btn}
          onPress={async () => {
            if (notes.trim() && (await props.check('quote', notes, book.id))) {
              setNotes(book.notes ?? '');
              return;
            }
            props.onUpdate({ notes });
            setNotesSaved(true);
          }}
        >
          {notesSaved ? <Icon name="checkmark" size={22} color="#fff" /> : <Text style={st.btnText}>Zapisz</Text>}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function AddBook({ check, onCancel, onSave }: { check: CoverProps['check']; onCancel: () => void; onSave: (b: Book) => void }) {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [pages, setPages] = useState('');
  const [isbn, setIsbn] = useState('');
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!title.trim()) return;
    const unlocked = (await check('addBook', title)) || (isbn ? await check('isbn', isbn) : false);
    if (unlocked) {
      onCancel();
      return;
    }
    const n = Number(pages);
    if (!n || n > 5000) {
      setError('Podaj liczbę stron.');
      return;
    }
    onSave({ id: newId(), title: title.trim(), author: author.trim(), pages: n, current: 0 });
  };

  return (
    <SafeAreaView style={st.screen} edges={['top']}>
      <View style={[st.topBar, { flexDirection: 'row', justifyContent: 'space-between' }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Anuluj" onPress={onCancel} hitSlop={10}>
          <Icon name="close" size={26} color={B.accent} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Zapisz" onPress={save} hitSlop={10}>
          <Icon name="checkmark" size={26} color={B.accent} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        <Text style={st.h1Detail}>Nowa książka</Text>
        <View style={st.form}>
          <TextInput {...secretSafeInput} value={title} onChangeText={setTitle} placeholder="Tytuł" placeholderTextColor={B.muted} style={st.input} />
          <TextInput value={author} onChangeText={setAuthor} placeholder="Autor" placeholderTextColor={B.muted} style={st.input} />
          <TextInput keyboardType="number-pad" value={pages} onChangeText={(v) => setPages(digits(v, 4))} placeholder="Liczba stron" placeholderTextColor={B.muted} style={st.input} />
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TextInput
              {...secretSafeInput}
              keyboardType="number-pad"
              value={isbn}
              onChangeText={(v) => setIsbn(digits(v, 13))}
              placeholder="ISBN"
              placeholderTextColor={B.muted}
              style={[st.input, { flex: 1 }]}
            />
            <Info text="ISBN jest nieobowiązkowy: to numer z tyłu okładki, nad kodem kreskowym." color={B.muted} />
          </View>
        </View>
        {error ? <Text style={st.error}>{error}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: B.bg },
  h1: { fontSize: 28, fontWeight: '800', color: B.text, paddingHorizontal: 16, paddingTop: 12 },
  h1Detail: { fontSize: 24, fontWeight: '800', color: B.text, marginBottom: 2 },
  topBar: { paddingHorizontal: 16, paddingVertical: 10 },
  bar2: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, marginBottom: 8 },
  cover: { width: 44, height: 60, borderRadius: 6, backgroundColor: B.soft, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  coverText: { fontSize: 20, fontWeight: '800', color: '#fff' },
  trophy: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5 },
  trophyText: { color: '#fff', fontWeight: '700' },
  shelf: { gap: 12, paddingTop: 14 },
  shelfBook: { alignItems: 'center' },
  bigCover: { width: 82, height: 116, borderRadius: 8, padding: 8, justifyContent: 'space-between', borderWidth: 2, borderColor: 'rgba(255,255,255,0.7)' },
  bigCoverText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  bigCoverBar: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.35)', overflow: 'hidden' },
  bigCoverFill: { height: 4, backgroundColor: '#fff' },
  shelfPct: { color: '#fff', fontSize: 12, fontWeight: '700', marginTop: 4 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 18, marginBottom: 6 },
  labelInline: { marginTop: 0, marginBottom: 0 },
  round: { width: 46, height: 46, borderRadius: 23, marginTop: 0, marginLeft: 8, paddingVertical: 0, justifyContent: 'center' },
  form: { gap: 10, marginTop: 14 },
  link: { color: B.accent, fontSize: 17 },
  section: { fontSize: 15, fontWeight: '700', color: B.muted },
  card: { flexDirection: 'row', backgroundColor: B.card, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: B.border },
  title: { fontSize: 17, fontWeight: '700', color: B.text, marginBottom: 2 },
  muted: { color: B.muted, fontSize: 14 },
  empty: { textAlign: 'center', color: B.muted, marginTop: 40 },
  bar: { height: 8, backgroundColor: B.soft, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, backgroundColor: B.accent, borderRadius: 4 },
  fab: { position: 'absolute', right: 16, bottom: 28, backgroundColor: B.accent, width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', elevation: 4 },
  label: { fontSize: 14, fontWeight: '600', color: B.text, marginTop: 16, marginBottom: 6 },
  input: { backgroundColor: B.card, borderRadius: 12, borderWidth: 1, borderColor: B.border, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, color: B.text },
  btn: { backgroundColor: B.accent, borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 10 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  error: { color: '#C62828', marginTop: 10 },
});
