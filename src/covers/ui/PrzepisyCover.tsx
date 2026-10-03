import { useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RECIPES, formatAmount, type Recipe } from '@/content/przepisy';
import { joinSequence, SEQUENCE_STEPS } from '@/covers/sequence';
import { Icon, Info, type IconName } from '@/ui/kit';

import { Backdrop, Hero } from './decor';
import { newId, secretSafeInput, usePersisted, useStepRecorder, type CoverProps } from './shared';

const K = {
  bg: '#FBF6F0',
  card: '#FFFFFF',
  text: '#3A2A20',
  muted: '#8A7466',
  accent: '#C0582B',
  soft: '#F3E3D3',
  border: '#EADBCB',
};

// Each category has its own colour and icon, like the tabs of a cookbook.
const CATEGORY: Record<string, { color: string; icon: IconName }> = {
  Ciasta: { color: '#D81B60', icon: 'ice-cream-outline' },
  Obiady: { color: '#E65100', icon: 'restaurant-outline' },
  Zupy: { color: '#F9A825', icon: 'flame-outline' },
  Śniadania: { color: '#43A047', icon: 'sunny-outline' },
};
const cat = (c: string | null) => (c && CATEGORY[c]) || { color: '#C0582B', icon: 'book-outline' as IconName };

type Overrides = Record<string, Record<number, number>>;
type Screen = { name: 'list' } | { name: 'recipe'; id: string } | { name: 'add' };

export default function PrzepisyCover({ check }: CoverProps) {
  const [favorites, setFavorites, loadedFav] = usePersisted<string[]>('przepisy.fav', ['sernik']);
  const [notes, setNotes] = usePersisted<Record<string, string>>('przepisy.notes', {});
  const [overrides, setOverrides] = usePersisted<Overrides>('przepisy.overrides', {});
  const [custom, setCustom] = usePersisted<Recipe[]>('przepisy.custom', []);
  const [lastRecipe, setLastRecipe, loadedLast] = usePersisted<string | null>('przepisy.last', 'sernik');
  // null until the user navigates: then we reopen the recipe she was looking at, like any cooking app.
  const [viewState, setView] = useState<Screen | null>(null);
  const view: Screen = viewState ?? (lastRecipe ? { name: 'recipe', id: lastRecipe } : { name: 'list' });
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);

  const all = useMemo(() => [...RECIPES, ...custom], [custom]);

  // Favourite taps form a sequence key; if it unlocks, undo the taps.
  const favSnapshot = useRef<string[] | null>(null);
  const recorder = useStepRecorder(async (steps, final, stop) => {
    const snapshot = favSnapshot.current;
    if (final) favSnapshot.current = null;
    if (steps.length >= 2 && (await check('favSeq', joinSequence(steps), undefined, { partial: !final }))) {
      stop();
      favSnapshot.current = null;
      if (snapshot) setFavorites(snapshot);
    }
  }, SEQUENCE_STEPS);

  const toggleFavorite = (id: string) => {
    if (!favSnapshot.current) favSnapshot.current = favorites;
    recorder.push(id);
    setFavorites((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));
  };

  const openRecipe = (id: string) => {
    setLastRecipe(id);
    setView({ name: 'recipe', id });
  };

  if (!loadedFav || !loadedLast) return <View style={{ flex: 1, backgroundColor: K.bg }} />;

  if (view.name === 'recipe') {
    const recipe = all.find((r) => r.id === view.id);
    if (recipe) {
      return (
        <RecipeView
          recipe={recipe}
          favorite={favorites.includes(recipe.id)}
          onFavorite={() => toggleFavorite(recipe.id)}
          note={notes[recipe.id] ?? ''}
          overrides={overrides[recipe.id] ?? {}}
          check={check}
          onSaveNote={(text) => setNotes((n) => ({ ...n, [recipe.id]: text }))}
          onSaveOverrides={(o) => setOverrides((all) => ({ ...all, [recipe.id]: o }))}
          onBack={() => {
            setLastRecipe(null);
            setView({ name: 'list' });
          }}
        />
      );
    }
  }

  if (view.name === 'add') {
    return (
      <AddRecipe
        check={check}
        onCancel={() => setView({ name: 'list' })}
        onSave={(r) => {
          setCustom((c) => [...c, r]);
          openRecipe(r.id);
        }}
      />
    );
  }

  const q = query.trim().toLowerCase();
  const shown = all.filter(
    (r) => (!category || r.category === category) && (!q || r.name.toLowerCase().includes(q) || r.ingredients.some((i) => i.name.includes(q))),
  );

  return (
    <SafeAreaView style={st.screen} edges={[]}>
      <Backdrop icons={['restaurant-outline', 'pizza-outline', 'ice-cream-outline', 'cafe-outline', 'nutrition-outline']} colors={['#D81B60', '#E65100', '#F9A825', '#43A047']} opacity={0.07} />
      <Hero
        color={K.accent}
        title="Moje przepisy"
        icons={['restaurant-outline', 'pizza-outline', 'ice-cream-outline', 'cafe-outline']}
        right={
          <View style={st.favs}>
            <Icon name="heart" size={16} color="#fff" />
            <Text style={st.favsText}>{favorites.length}</Text>
          </View>
        }
      >
        <View style={st.searchRow}>
          <Icon name="search" size={20} color={K.muted} />
          <TextInput
            {...secretSafeInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Przepis lub składnik"
            placeholderTextColor={K.muted}
            returnKeyType="search"
            onSubmitEditing={async () => {
              if (query.trim() && (await check('search', query))) setQuery('');
            }}
            style={st.search}
          />
        </View>
      </Hero>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
        {[null, 'Ciasta', 'Obiady', 'Zupy', 'Śniadania'].map((c) => (
          <Pressable key={c ?? 'all'} onPress={() => setCategory(c)} style={[st.chip, category === c && { backgroundColor: cat(c).color }]}>
            {c ? <Icon name={cat(c).icon} size={15} color={category === c ? '#fff' : cat(c).color} /> : null}
            <Text style={[st.chipText, category === c && { color: '#fff' }]}>{c ?? 'Wszystkie'}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <FlatList
        data={shown}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ padding: 16, paddingTop: 4, paddingBottom: 100 }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 50, gap: 8 }}>
            <Icon name="restaurant-outline" size={44} color={K.border} />
            <Text style={st.muted}>Brak wyników</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => openRecipe(item.id)} style={st.card}>
            <View style={[st.catIcon, { backgroundColor: cat(item.category).color + '1F' }]}>
              <Icon name={cat(item.category).icon} size={22} color={cat(item.category).color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.cardTitle}>{item.name}</Text>
              <Meta minutes={item.minutes} servings={item.servings} />
            </View>
            <Pressable hitSlop={12} onPress={() => toggleFavorite(item.id)} accessibilityLabel="Ulubione">
              <Icon name={favorites.includes(item.id) ? 'heart' : 'heart-outline'} size={26} color={favorites.includes(item.id) ? K.accent : K.muted} />
            </Pressable>
          </Pressable>
        )}
      />
      <Pressable accessibilityRole="button" accessibilityLabel="Dodaj przepis" style={st.fab} onPress={() => setView({ name: 'add' })}>
        <Icon name="add" size={28} color="#fff" />
      </Pressable>
    </SafeAreaView>
  );
}

/** Time and servings as two small icons with numbers. */
function Meta({ minutes, servings }: { minutes: number; servings?: number }) {
  return (
    <View style={st.meta}>
      <Icon name="time-outline" size={14} color={K.muted} />
      <Text style={st.muted}>{minutes} min</Text>
      {servings ? (
        <>
          <View style={{ marginLeft: 10 }}>
            <Icon name="people-outline" size={14} color={K.muted} />
          </View>
          <Text style={st.muted}>{servings}</Text>
        </>
      ) : null}
    </View>
  );
}

function RecipeView(props: {
  recipe: Recipe;
  favorite: boolean;
  onFavorite: () => void;
  note: string;
  overrides: Record<number, number>;
  check: CoverProps['check'];
  onSaveNote: (t: string) => void;
  onSaveOverrides: (o: Record<number, number>) => void;
  onBack: () => void;
}) {
  const { recipe, overrides } = props;
  const [servings, setServings] = useState(recipe.servings);
  const [editing, setEditing] = useState<Record<number, string> | null>(null);
  const [note, setNote] = useState(props.note);
  const [noteSaved, setNoteSaved] = useState(false);
  const amountOf = (i: number) => overrides[i] ?? recipe.ingredients[i].amount;
  const factor = servings / recipe.servings;

  const saveEdits = async () => {
    if (!editing) return;
    const next = { ...overrides };
    for (const [idx, raw] of Object.entries(editing)) {
      const i = Number(idx);
      const value = Number(raw.replace(',', '.'));
      if (!raw.trim() || Number.isNaN(value) || value === amountOf(i)) continue;
      if (await props.check('editIngredient', raw, `${recipe.id}/${i}`)) {
        setEditing(null); // key matched: discard every change
        return;
      }
      next[i] = value;
    }
    props.onSaveOverrides(next);
    setEditing(null);
  };

  return (
    <SafeAreaView style={st.screen} edges={['top']}>
      <View style={st.topBar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Przepisy" onPress={props.onBack} hitSlop={10}>
          <Icon name="chevron-back" size={26} color={K.accent} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Ulubione" onPress={props.onFavorite} hitSlop={10}>
          <Icon name={props.favorite ? 'heart' : 'heart-outline'} size={26} color={props.favorite ? K.accent : K.muted} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        <Text style={st.h1Recipe}>{recipe.name}</Text>
        <Meta minutes={recipe.minutes} />

        <View style={st.servingsRow}>
          <Text style={[st.section, { marginBottom: 0, flex: 1 }]}>Składniki</Text>
          {editing ? null : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Edytuj ilości"
              hitSlop={8}
              style={{ marginRight: 12 }}
              onPress={() => {
                setServings(recipe.servings);
                setEditing({});
              }}
            >
              <Icon name="create-outline" size={22} color={K.accent} />
            </Pressable>
          )}
          <View style={st.stepper}>
            <Pressable accessibilityLabel="Mniej porcji" onPress={() => setServings((s) => Math.max(1, s - 1))} style={st.stepBtn}>
              <Icon name="remove" size={18} color={K.text} />
            </Pressable>
            <Icon name="people-outline" size={15} color={K.text} />
            <Text style={st.servings}>{servings}</Text>
            <Pressable accessibilityLabel="Więcej porcji" onPress={() => setServings((s) => s + 1)} style={st.stepBtn}>
              <Icon name="add" size={18} color={K.text} />
            </Pressable>
          </View>
        </View>

        {recipe.ingredients.map((ing, i) => (
          <View key={i} style={st.ingredient}>
            <Text style={[st.body, { flex: 1 }]}>{ing.name}</Text>
            {editing ? (
              <TextInput
                {...secretSafeInput}
                keyboardType="decimal-pad"
                value={editing[i] ?? formatAmount(amountOf(i))}
                onChangeText={(t) => setEditing((e) => ({ ...e, [i]: t }))}
                style={st.amountInput}
              />
            ) : (
              <Text style={st.amount}>{formatAmount(amountOf(i) * factor)}</Text>
            )}
            <Text style={st.unit}>{ing.unit}</Text>
          </View>
        ))}
        {editing ? (
          <View style={{ flexDirection: 'row', marginTop: 10 }}>
            <Pressable accessibilityRole="button" accessibilityLabel="Anuluj" style={[st.btn, { backgroundColor: K.soft }]} onPress={() => setEditing(null)}>
              <Icon name="close" size={22} color={K.text} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Zapisz" style={[st.btn, { marginLeft: 10 }]} onPress={saveEdits}>
              <Icon name="checkmark" size={22} color="#fff" />
            </Pressable>
          </View>
        ) : null}

        <Text style={[st.section, { marginTop: 22 }]}>Przygotowanie</Text>
        {recipe.steps.map((step, i) => (
          <View key={i} style={st.step}>
            <Text style={st.stepNo}>{i + 1}</Text>
            <Text style={[st.body, { flex: 1 }]}>{step}</Text>
          </View>
        ))}

        <View style={st.labelRow}>
          <Icon name="create-outline" size={18} color={K.text} />
          <Text style={[st.section, { marginBottom: 0 }]}>Notatki</Text>
        </View>
        <TextInput
          {...secretSafeInput}
          multiline
          value={note}
          onChangeText={(t) => {
            setNote(t);
            setNoteSaved(false);
          }}
          placeholder="mniej cukru, piec 5 minut dłużej"
          placeholderTextColor={K.muted}
          style={st.note}
        />
        <Pressable
          style={[st.btn, { marginTop: 8 }]}
          onPress={async () => {
            if (note.trim() && (await props.check('note', note, recipe.id))) {
              setNote(props.note);
              return;
            }
            props.onSaveNote(note);
            setNoteSaved(true);
          }}
        >
          {noteSaved ? <Icon name="checkmark" size={22} color="#fff" /> : <Text style={st.btnText}>Zapisz</Text>}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function AddRecipe({ check, onCancel, onSave }: { check: CoverProps['check']; onCancel: () => void; onSave: (r: Recipe) => void }) {
  const [name, setName] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [steps, setSteps] = useState('');

  const save = async () => {
    if (!name.trim()) return;
    if (await check('addRecipe', name)) {
      onCancel();
      return;
    }
    onSave({
      id: newId(),
      name: name.trim(),
      category: 'Obiady',
      minutes: 30,
      servings: 4,
      ingredients: ingredients
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l) => {
          const m = /^(.*?)\s+(\d+(?:[.,]\d+)?)\s*(\S*)$/.exec(l);
          return m ? { name: m[1], amount: Number(m[2].replace(',', '.')), unit: m[3] } : { name: l, amount: 1, unit: '' };
        }),
      steps: steps
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean),
    });
  };

  return (
    <SafeAreaView style={st.screen} edges={['top']}>
      <View style={st.topBar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Anuluj" onPress={onCancel} hitSlop={10}>
          <Icon name="close" size={26} color={K.accent} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Zapisz" onPress={save} hitSlop={10}>
          <Icon name="checkmark" size={26} color={K.accent} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        <Text style={st.h1Recipe}>Nowy przepis</Text>
        <TextInput {...secretSafeInput} value={name} onChangeText={setName} placeholder="Nazwa" placeholderTextColor={K.muted} style={[st.field, { marginTop: 14 }]} />
        <View style={st.labelRow}>
          <Icon name="list-outline" size={18} color={K.text} />
          <Text style={[st.label, { marginTop: 0, marginBottom: 0 }]}>Składniki</Text>
          <Info text="Jeden składnik w linii, np. „mąka 500 g”." color={K.muted} />
        </View>
        <TextInput multiline value={ingredients} onChangeText={setIngredients} placeholder="mąka 500 g" placeholderTextColor={K.muted} style={[st.field, { minHeight: 120 }]} />
        <View style={st.labelRow}>
          <Icon name="reorder-four-outline" size={18} color={K.text} />
          <Text style={[st.label, { marginTop: 0, marginBottom: 0 }]}>Kroki</Text>
          <Info text="Jeden krok w linii." color={K.muted} />
        </View>
        <TextInput multiline value={steps} onChangeText={setSteps} style={[st.field, { minHeight: 120 }]} />
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: K.bg },
  h1: { fontSize: 28, fontWeight: '800', color: K.text, paddingHorizontal: 16, paddingTop: 12 },
  h1Recipe: { fontSize: 26, fontWeight: '800', color: K.text, marginBottom: 4 },
  favs: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5 },
  favsText: { color: '#fff', fontWeight: '700' },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, paddingHorizontal: 12, backgroundColor: K.card, borderRadius: 12, borderWidth: 1, borderColor: K.border },
  search: { flex: 1, paddingVertical: 11, fontSize: 16, color: K.text },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 22, marginBottom: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: K.card, borderWidth: 1, borderColor: K.border, marginRight: 8 },
  catIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  chipOn: { backgroundColor: K.accent },
  chipText: { color: K.text, fontSize: 14 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: K.card, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: K.border },
  cardTitle: { fontSize: 17, fontWeight: '700', color: K.text, marginBottom: 3 },
  muted: { color: K.muted, fontSize: 14 },
  fab: { position: 'absolute', right: 16, bottom: 28, backgroundColor: K.accent, width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', elevation: 4 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  back: { color: K.accent, fontSize: 17 },
  section: { fontSize: 18, fontWeight: '700', color: K.text, marginBottom: 8 },
  servingsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18 },
  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: K.soft, borderRadius: 18, paddingHorizontal: 2 },
  stepBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  servings: { fontSize: 14, fontWeight: '600', color: K.text, minWidth: 26, textAlign: 'center', marginLeft: 3 },
  ingredient: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: K.border },
  amount: { fontSize: 16, fontWeight: '600', color: K.text, minWidth: 50, textAlign: 'right' },
  amountInput: { fontSize: 16, color: K.text, minWidth: 70, textAlign: 'right', borderBottomWidth: 1, borderBottomColor: K.accent, paddingVertical: 2 },
  unit: { fontSize: 14, color: K.muted, minWidth: 64, marginLeft: 6 },
  body: { fontSize: 16, color: K.text, lineHeight: 23 },
  step: { flexDirection: 'row', marginBottom: 12 },
  stepNo: { width: 26, height: 26, borderRadius: 13, backgroundColor: K.soft, textAlign: 'center', lineHeight: 26, fontWeight: '700', color: K.accent, marginRight: 10 },
  note: { backgroundColor: K.card, borderRadius: 12, borderWidth: 1, borderColor: K.border, padding: 12, minHeight: 90, fontSize: 16, color: K.text, textAlignVertical: 'top' },
  btn: { flex: 1, backgroundColor: K.accent, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  label: { fontSize: 14, fontWeight: '600', color: K.text, marginTop: 14, marginBottom: 6 },
  field: { backgroundColor: K.card, borderRadius: 12, borderWidth: 1, borderColor: K.border, padding: 12, fontSize: 16, color: K.text, textAlignVertical: 'top' },
});
