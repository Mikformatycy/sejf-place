import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
  const sections: [string, Book[]][] = [
    ['Czytam', reading],
    ['Do przeczytania', toRead],
    ['Przeczytane', done],
  ];

  return (
    <SafeAreaView style={st.screen} edges={['top']}>
      <Text style={st.h1}>Czytelniczka</Text>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {books.length === 0 ? <Text style={st.empty}>Dodaj pierwszą książkę.</Text> : null}
        {sections
          .filter(([, list]) => list.length > 0)
          .map(([title, list]) => (
            <View key={title}>
              <Text style={st.section}>
                {title} ({list.length})
              </Text>
              {list.map((b) => (
                <Pressable key={b.id} onPress={() => setScreen({ name: 'book', id: b.id })} style={st.card}>
                  <Text style={st.title}>{b.title}</Text>
                  <Text style={st.muted}>{b.author}</Text>
                  <Progress book={b} />
                </Pressable>
              ))}
            </View>
          ))}
      </ScrollView>
      <Pressable style={st.fab} onPress={() => setScreen({ name: 'add' })}>
        <Text style={st.fabText}>+ Dodaj książkę</Text>
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
      <Pressable onPress={props.onBack} hitSlop={10} style={st.topBar}>
        <Text style={st.link}>‹ Książki</Text>
      </Pressable>
      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        <Text style={st.h1Detail}>{book.title}</Text>
        <Text style={st.muted}>{book.author}</Text>
        <Progress book={book} />

        <Text style={st.label}>Jestem na stronie</Text>
        <View style={{ flexDirection: 'row' }}>
          <TextInput keyboardType="number-pad" value={page} onChangeText={(v) => setPage(digits(v, 5))} style={[st.input, { flex: 1 }]} />
          <Pressable style={[st.btn, st.btnInline]} onPress={savePage}>
            <Text style={st.btnText}>Zapisz</Text>
          </Pressable>
        </View>
        {book.current < book.pages ? (
          <Pressable
            style={[st.btn, { backgroundColor: B.soft }]}
            onPress={() => {
              setPage(String(book.pages));
              props.onUpdate({ current: book.pages });
            }}
          >
            <Text style={[st.btnText, { color: B.accent }]}>Przeczytana</Text>
          </Pressable>
        ) : null}

        <Text style={st.label}>Moje notatki</Text>
        <TextInput
          {...secretSafeInput}
          multiline
          value={notes}
          onChangeText={(t) => {
            setNotes(t);
            setNotesSaved(false);
          }}
          placeholder="np. ulubione cytaty, wrażenia"
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
          <Text style={st.btnText}>{notesSaved ? 'Zapisano ✓' : 'Zapisz notatkę'}</Text>
        </Pressable>
        <Pressable
          style={[st.btn, { backgroundColor: 'transparent' }]}
          onPress={() =>
            Alert.alert(`Usunąć „${book.title}”?`, undefined, [
              { text: 'Anuluj', style: 'cancel' },
              { text: 'Usuń', style: 'destructive', onPress: props.onDelete },
            ])
          }
        >
          <Text style={[st.btnText, { color: B.muted }]}>Usuń książkę</Text>
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
        <Pressable onPress={onCancel} hitSlop={10}>
          <Text style={st.link}>‹ Anuluj</Text>
        </Pressable>
        <Pressable onPress={save} hitSlop={10}>
          <Text style={[st.link, { fontWeight: '700' }]}>Zapisz</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        <Text style={st.h1Detail}>Nowa książka</Text>
        <Text style={st.label}>Tytuł</Text>
        <TextInput {...secretSafeInput} value={title} onChangeText={setTitle} placeholder="np. Pan Tadeusz" placeholderTextColor={B.muted} style={st.input} />
        <Text style={st.label}>Autor</Text>
        <TextInput value={author} onChangeText={setAuthor} placeholder="np. Adam Mickiewicz" placeholderTextColor={B.muted} style={st.input} />
        <Text style={st.label}>Liczba stron</Text>
        <TextInput keyboardType="number-pad" value={pages} onChangeText={(v) => setPages(digits(v, 4))} style={st.input} />
        <Text style={st.label}>ISBN (nieobowiązkowy)</Text>
        <TextInput {...secretSafeInput} keyboardType="number-pad" value={isbn} onChangeText={(v) => setIsbn(digits(v, 13))} style={st.input} />
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
  link: { color: B.accent, fontSize: 17 },
  section: { fontSize: 15, fontWeight: '700', color: B.muted, marginTop: 10, marginBottom: 8 },
  card: { backgroundColor: B.card, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: B.border },
  title: { fontSize: 17, fontWeight: '700', color: B.text, marginBottom: 2 },
  muted: { color: B.muted, fontSize: 14 },
  empty: { textAlign: 'center', color: B.muted, marginTop: 40 },
  bar: { height: 8, backgroundColor: B.soft, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, backgroundColor: B.accent, borderRadius: 4 },
  fab: { position: 'absolute', right: 16, bottom: 28, backgroundColor: B.accent, borderRadius: 26, paddingHorizontal: 20, paddingVertical: 14, elevation: 4 },
  fabText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  label: { fontSize: 14, fontWeight: '600', color: B.text, marginTop: 16, marginBottom: 6 },
  input: { backgroundColor: B.card, borderRadius: 12, borderWidth: 1, borderColor: B.border, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, color: B.text },
  btn: { backgroundColor: B.accent, borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 10 },
  btnInline: { marginTop: 0, marginLeft: 8, paddingHorizontal: 18 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  error: { color: '#C62828', marginTop: 10 },
});
