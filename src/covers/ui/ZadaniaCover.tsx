import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { newId, secretSafeInput, usePersisted, type CoverProps } from './shared';

type ListId = 'dom' | 'zakupy';

interface Task {
  id: string;
  list: ListId;
  text: string;
  done: boolean;
  due?: string; // "DD.MM GG:MM"
}

const Z = { bg: '#F4F8FC', card: '#FFFFFF', text: '#17324D', muted: '#6B8299', accent: '#1E88E5', border: '#D9E6F2' };

const two = (s: string) => s.replace(/\D/g, '').slice(0, 2);
const pad = (s: string) => s.padStart(2, '0');

type Due = { d: string; m: string; h: string; min: string };
const inRange = (v: string, lo: number, hi: number) => v !== '' && Number(v) >= lo && Number(v) <= hi;
const validDue = (due: Due) => inRange(due.d, 1, 31) && inRange(due.m, 1, 12) && inRange(due.h, 0, 23) && inRange(due.min, 0, 59);

export default function ZadaniaCover({ check }: CoverProps) {
  const [tasks, setTasks] = usePersisted<Task[]>('zadania.tasks', []);
  const [list, setList] = useState<ListId>('dom');
  const [text, setText] = useState('');
  const [withDue, setWithDue] = useState(false);
  const [due, setDue] = useState<Due>({ d: '', m: '', h: '', min: '' });
  const [dueError, setDueError] = useState(false);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');

  const dueComplete = due.d && due.m && due.h && due.min;

  const add = async () => {
    if (!text.trim()) return;
    const unlocked =
      (await check('addTask', text, list)) ||
      (withDue && dueComplete ? await check('addTaskDue', `${pad(due.d)}${pad(due.m)}${pad(due.h)}${pad(due.min)}`) : false);
    if (!unlocked) {
      // Like any to-do app: an impossible or half-filled date is not saved silently.
      const anyDue = withDue && (due.d || due.m || due.h || due.min);
      if (anyDue && !validDue(due)) {
        setDueError(true);
        return;
      }
      const dueText = anyDue ? `${pad(due.d)}.${pad(due.m)} ${pad(due.h)}:${pad(due.min)}` : undefined;
      setTasks((t) => [{ id: newId(), list, text: text.trim(), done: false, due: dueText }, ...t]);
    }
    setDueError(false);
    setText('');
    setDue({ d: '', m: '', h: '', min: '' });
    setWithDue(false);
  };

  const q = query.trim().toLowerCase();
  const shown = tasks
    .filter((t) => (searching && q ? t.text.toLowerCase().includes(q) : t.list === list))
    .sort((a, b) => Number(a.done) - Number(b.done));

  return (
    <SafeAreaView style={st.screen} edges={['top']}>
      <View style={st.header}>
        <Text style={st.h1}>Zadania</Text>
        <Pressable
          onPress={() => {
            setSearching((v) => !v);
            setQuery('');
          }}
          hitSlop={10}
        >
          <Text style={st.link}>{searching ? 'Zamknij' : 'Szukaj'}</Text>
        </Pressable>
      </View>

      {searching ? (
        <TextInput
          {...secretSafeInput}
          autoFocus
          value={query}
          onChangeText={setQuery}
          placeholder="Szukaj w zadaniach"
          placeholderTextColor={Z.muted}
          returnKeyType="search"
          onSubmitEditing={async () => {
            if (query.trim() && (await check('search', query))) {
              setQuery('');
              setSearching(false);
            }
          }}
          style={[st.input, { marginHorizontal: 16, marginBottom: 8 }]}
        />
      ) : (
        <View style={st.tabs}>
          {(['dom', 'zakupy'] as ListId[]).map((l) => (
            <Pressable key={l} onPress={() => setList(l)} style={[st.tab, list === l && st.tabOn]}>
              <Text style={[st.tabText, list === l && { color: '#fff' }]}>{l === 'dom' ? 'Dom' : 'Zakupy'}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <FlatList
        data={shown}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 200 }}
        ListEmptyComponent={<Text style={st.empty}>{searching ? 'Brak wyników.' : 'Brak zadań. Dodaj pierwsze poniżej.'}</Text>}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => setTasks((all) => all.map((t) => (t.id === item.id ? { ...t, done: !t.done } : t)))}
            onLongPress={() => setTasks((all) => all.filter((t) => t.id !== item.id))}
            style={st.task}
          >
            <View style={[st.box, item.done && st.boxOn]}>{item.done ? <Text style={st.tick}>✓</Text> : null}</View>
            <View style={{ flex: 1 }}>
              <Text style={[st.taskText, item.done && st.doneText]}>{item.text}</Text>
              {item.due ? <Text style={st.due}>⏰ {item.due}</Text> : null}
            </View>
          </Pressable>
        )}
      />

      {!searching && (
        <View style={st.composer}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TextInput
              {...secretSafeInput}
              value={text}
              onChangeText={setText}
              placeholder={list === 'dom' ? 'Nowe zadanie' : 'Co kupić?'}
              placeholderTextColor={Z.muted}
              onSubmitEditing={add}
              returnKeyType="done"
              style={[st.input, { flex: 1 }]}
            />
            <Pressable onPress={add} style={st.addBtn}>
              <Text style={st.addText}>Dodaj</Text>
            </Pressable>
          </View>
          <Pressable onPress={() => setWithDue((v) => !v)}>
            <Text style={[st.link, { marginTop: 8 }]}>{withDue ? '− Bez terminu' : '+ Termin'}</Text>
          </Pressable>
          {withDue && (
            <View style={st.dueRow}>
              <TextInput keyboardType="number-pad" placeholder="DD" value={due.d} onChangeText={(v) => setDue({ ...due, d: two(v) })} style={st.dueInput} />
              <Text style={st.sep}>.</Text>
              <TextInput keyboardType="number-pad" placeholder="MM" value={due.m} onChangeText={(v) => setDue({ ...due, m: two(v) })} style={st.dueInput} />
              <Text style={[st.sep, { marginHorizontal: 10 }]}>godz.</Text>
              <TextInput keyboardType="number-pad" placeholder="GG" value={due.h} onChangeText={(v) => setDue({ ...due, h: two(v) })} style={st.dueInput} />
              <Text style={st.sep}>:</Text>
              <TextInput keyboardType="number-pad" placeholder="MM" value={due.min} onChangeText={(v) => setDue({ ...due, min: two(v) })} style={st.dueInput} />
            </View>
          )}
          {dueError ? <Text style={st.error}>Sprawdź termin.</Text> : null}
          <Text style={st.hint}>Stuknij, aby odhaczyć. Przytrzymaj, aby usunąć.</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Z.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  h1: { fontSize: 28, fontWeight: '800', color: Z.text },
  link: { color: Z.accent, fontSize: 16, fontWeight: '600' },
  tabs: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 4 },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 18, backgroundColor: '#E3EDF7', marginRight: 8 },
  tabOn: { backgroundColor: Z.accent },
  tabText: { color: Z.text, fontWeight: '600' },
  empty: { textAlign: 'center', color: Z.muted, marginTop: 40 },
  task: { flexDirection: 'row', alignItems: 'center', backgroundColor: Z.card, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: Z.border },
  box: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: Z.accent, marginRight: 12, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: Z.accent },
  tick: { color: '#fff', fontWeight: '800' },
  taskText: { fontSize: 16, color: Z.text },
  doneText: { textDecorationLine: 'line-through', color: Z.muted },
  due: { fontSize: 13, color: Z.muted, marginTop: 2 },
  composer: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: Z.card, padding: 16, paddingBottom: 28, borderTopWidth: 1, borderTopColor: Z.border },
  input: { backgroundColor: '#F0F5FA', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, color: Z.text },
  addBtn: { backgroundColor: Z.accent, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 11, marginLeft: 8 },
  addText: { color: '#fff', fontWeight: '700' },
  dueRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  dueInput: { backgroundColor: '#F0F5FA', borderRadius: 8, width: 48, textAlign: 'center', paddingVertical: 8, fontSize: 16, color: Z.text },
  sep: { fontSize: 16, color: Z.muted, marginHorizontal: 4 },
  hint: { fontSize: 12, color: Z.muted, marginTop: 8 },
  error: { fontSize: 13, color: '#C62828', marginTop: 8 },
});
