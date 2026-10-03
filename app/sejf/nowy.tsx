import { router, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { FORMS } from '@/content/formy';
import { amountField, moneyAmounts, parseAmount, takesAmount } from '@/content/pieniadze';
import { formatBytes, nowLocal } from '@/ui/format';
import { Btn, C, CheckRow, Chip, Field, H2, Icon, IconBtn, List, Notice, VaultScreen, s, type IconName } from '@/ui/kit';
import { themed } from '@/ui/theme';
import { saveEntry } from '@/vault/actions';
import { pickDocument, pickFromGallery, useDraft, type DraftFields } from '@/vault/evidence';
import { markActivity } from '@/vault/quickExit';
import { useSession } from '@/vault/session';
import type { Attachment, EntryContent, MoneyAmount } from '@/vault/types';

const toDateField = (local: string) => {
  const [d, t] = local.split('T');
  const [y, m, day] = d.split('-');
  return { date: `${day}.${m}.${y}`, time: t ?? '' };
};

/** "12.09.2026" + "21:30" -> "2026-09-12T21:30", or null when it is not a real date. */
function parseLocal(date: string, time: string): string | null {
  const dm = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(date.trim());
  const tm = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!dm || !tm) return null;
  const [d, m, y] = [Number(dm[1]), Number(dm[2]), Number(dm[3])];
  const [h, mi] = [Number(tm[1]), Number(tm[2])];
  // new Date rolls 31.02 over to March; a real date survives the round trip.
  const probe = new Date(y, m - 1, d);
  if (probe.getMonth() !== m - 1 || probe.getDate() !== d || h > 23 || mi > 59) return null;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${y}-${p(m)}-${p(d)}T${p(h)}:${p(mi)}`;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** The picker's starting value: what is in the fields, or now. */
function fieldsToDate(date: string, time: string): Date {
  const local = parseLocal(date, time);
  return local ? new Date(local) : new Date();
}

function initialFields(base?: EntryContent | null): DraftFields {
  const { date, time } = toDateField(base?.occurredAt ?? nowLocal());
  return {
    date,
    time,
    place: base?.place ?? '',
    forms: base?.forms ?? [],
    tags: base?.tags ?? [],
    description: base?.description ?? '',
    injuries: base?.injuries ?? null,
    injuriesDescription: base?.injuriesDescription ?? '',
    witnesses: base?.witnesses ?? '',
    childrenPresent: base?.childrenPresent ?? null,
    isFirst: base?.isFirst ?? false,
    amounts: base ? Object.fromEntries(moneyAmounts(base).map((a) => [a.tag, amountField(a.amount)])) : {},
  };
}

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

const KIND_LABEL = { photo: 'Zdjęcie', audio: 'Nagranie', image: 'Obraz', document: 'Plik' } as const;

export default function NewEntry() {
  const { correctionOf } = useLocalSearchParams<{ correctionOf?: string }>();
  const draftKey = correctionOf ?? 'new';
  const original = useSession((st) => (correctionOf ? st.index?.entries.find((e) => e.id === correctionOf) : undefined));
  const attachments = useDraft((d) => d.attachments);

  // Reopening the form brings back the unsaved draft (text and attachments).
  const [f, setF] = useState<DraftFields>(() => {
    const d = useDraft.getState();
    return d.key === draftKey && d.fields ? d.fields : initialFields(original?.content);
  });
  const [picker, setPicker] = useState<'date' | 'time' | null>(null);
  const [saving, setSaving] = useState(false);
  const [galleryNote, setGalleryNote] = useState(false);

  // Attachments of a draft for another entry are kept (never silently deleted); only its text is dropped.
  useEffect(() => {
    if (useDraft.getState().key !== draftKey) useDraft.setState({ key: draftKey, fields: null });
  }, [draftKey]);
  useEffect(() => useDraft.getState().setFields(draftKey, f), [draftKey, f]);

  const set = <K extends keyof DraftFields>(k: K, v: DraftFields[K]) => setF((prev) => ({ ...prev, [k]: v }));

  const picked = (d: Date | undefined) => {
    const mode = picker;
    setPicker(null);
    if (!d || !mode) return;
    markActivity();
    if (mode === 'date') set('date', `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`);
    else set('time', `${pad(d.getHours())}:${pad(d.getMinutes())}`);
  };

  const save = async () => {
    const occurredAt = parseLocal(f.date, f.time);
    if (!occurredAt) {
      Alert.alert('Sprawdź datę', 'Wybierz datę i godzinę.');
      return;
    }
    if (occurredAt > nowLocal()) {
      Alert.alert('Sprawdź datę', 'Data zdarzenia jest w przyszłości.');
      return;
    }
    const tags = f.tags.filter((t) => FORMS.some((form) => f.forms.includes(form.id) && form.examples.includes(t)));
    // Amounts count only for details that are still ticked.
    const amounts: MoneyAmount[] = [];
    for (const tag of tags.filter(takesAmount)) {
      const amount = parseAmount(f.amounts?.[tag] ?? '');
      if (Number.isNaN(amount)) {
        Alert.alert('Sprawdź kwotę', 'Np. 250 albo 1250,50.');
        return;
      }
      if (amount !== null) amounts.push({ tag, amount, currency: 'PLN' });
    }
    if (!f.description.trim() && attachments.length === 0 && amounts.length === 0) {
      Alert.alert('Pusty wpis', 'Dodaj opis albo załącznik.');
      return;
    }
    setSaving(true);
    const content: EntryContent = {
      occurredAt,
      occurredApprox: false,
      place: f.place.trim(),
      forms: f.forms,
      tags,
      description: f.description.trim(),
      injuries: f.injuries,
      injuriesDescription: f.injuries ? f.injuriesDescription.trim() : '',
      witnesses: f.witnesses.trim(),
      childrenPresent: f.childrenPresent,
      isFirst: f.isFirst,
      attachments,
      ...(amounts.length ? { amounts } : {}),
      ...(original ? { correctionOf: original.id } : {}),
    };
    try {
      const entry = await saveEntry(content);
      useDraft.getState().reset();
      router.replace({ pathname: '/sejf/wpis/[id]', params: { id: entry.id } });
    } catch (e) {
      setSaving(false);
      Alert.alert('Nie udało się zapisać', String(e));
    }
  };

  const discard = () =>
    Alert.alert('Odrzucić wpis?', 'Tekst i dodane załączniki zostaną usunięte.', [
      { text: 'Anuluj', style: 'cancel' },
      {
        text: 'Odrzuć',
        style: 'destructive',
        onPress: () => {
          useDraft.getState().reset(true);
          router.back();
        },
      },
    ]);

  const addFrom = async (pick: () => Promise<Attachment | null>, fromGallery: boolean) => {
    try {
      const a = await pick();
      if (!a) return;
      useDraft.getState().add(a);
      if (fromGallery) setGalleryNote(true);
    } catch (e) {
      Alert.alert('Nie udało się dodać pliku', String(e));
    }
  };

  return (
    <VaultScreen
      title={original ? 'Edycja' : 'Nowy wpis'}
      footer={
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <IconBtn icon="trash-outline" label="Odrzuć wpis" onPress={discard} disabled={saving} color={C.muted} size={48} />
          <Btn label="Zapisz" onPress={save} busy={saving} style={{ flex: 1 }} />
        </View>
      }
    >

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <PickField label="Data" icon="calendar-outline" value={f.date} onPress={() => setPicker('date')} flex={3} />
        <PickField label="Godzina" icon="time-outline" value={f.time} onPress={() => setPicker('time')} flex={2} />
      </View>
      {picker ? (
        <DateTimePicker
          value={fieldsToDate(f.date, f.time)}
          mode={picker}
          is24Hour
          maximumDate={new Date()}
          onChange={(e, d) => picked(e.type === 'set' ? d : undefined)}
        />
      ) : null}

      <Field
        label="Co się stało?"
        placeholder="np. co się stało, gdzie, kto był obecny"
        value={f.description}
        onChangeText={(v) => set('description', v)}
        multiline
      />

      <H2>Załączniki</H2>
      <View style={st.attachRow}>
        <IconBtn icon="camera-outline" label="Zdjęcie" size={56} color={C.primary} bg={C.primarySoft} onPress={() => router.push('/sejf/aparat')} />
        <IconBtn icon="mic-outline" label="Nagranie" size={56} color={C.primary} bg={C.primarySoft} onPress={() => router.push('/sejf/nagranie')} />
        <IconBtn icon="images-outline" label="Z galerii" size={56} color={C.primary} bg={C.primarySoft} onPress={() => addFrom(pickFromGallery, true)} />
        <IconBtn icon="attach" label="Plik" size={56} color={C.primary} bg={C.primarySoft} onPress={() => addFrom(pickDocument, false)} />
      </View>
      {galleryNote ? <Notice tone="warn">Usuń oryginał z galerii.</Notice> : null}
      {attachments.length > 0 && (
        <List>
          {attachments.map((a, i) => (
            <View key={a.id} style={[st.attachment, i < attachments.length - 1 && st.divider]}>
              <Text style={{ flex: 1, color: C.text }} numberOfLines={1}>
                {KIND_LABEL[a.kind]} · {formatBytes(a.size)}
              </Text>
              <IconBtn icon="close-circle" label="Usuń załącznik" size={32} color={C.muted} onPress={() => useDraft.getState().remove(a.id)} />
            </View>
          ))}
        </List>
      )}

      {/* Pick a form, then what exactly happened; a ticked form opens its own list. */}
      <H2>Rodzaj przemocy</H2>
      <List>
        {FORMS.map((form, i) => {
          const on = f.forms.includes(form.id);
          const picked = form.examples.filter((ex) => f.tags.includes(ex)).length;
          const lastForm = i === FORMS.length - 1;
          return (
            <View key={form.id}>
              <CheckRow
                label={form.label}
                icon={form.icon}
                checked={on}
                right={on && picked ? String(picked) : undefined}
                onPress={() => set('forms', toggle(f.forms, form.id))}
                last={lastForm && !on}
              />
              {on &&
                form.examples.map((ex, j) => {
                  const ticked = f.tags.includes(ex);
                  const lastRow = lastForm && j === form.examples.length - 1;
                  return (
                    <View key={ex}>
                      <CheckRow nested label={ex} checked={ticked} onPress={() => set('tags', toggle(f.tags, ex))} last={lastRow && !(ticked && takesAmount(ex))} />
                      {ticked && takesAmount(ex) ? (
                        <View style={[st.nestedField, !lastRow && st.divider]}>
                          <TextInput
                            style={s.input}
                            value={f.amounts?.[ex] ?? ''}
                            onChangeText={(v) => {
                              markActivity();
                              set('amounts', { ...f.amounts, [ex]: v });
                            }}
                            placeholder="Kwota, zł (jeśli znasz)"
                            placeholderTextColor="#9AA0A6"
                            keyboardType="decimal-pad"
                          />
                        </View>
                      ) : null}
                    </View>
                  );
                })}
            </View>
          );
        })}
      </List>

      <Text style={st.subLabel}>Czy były przy tym dzieci?</Text>
      <TriChoice value={f.childrenPresent} onChange={(v) => set('childrenPresent', v)} />
    </VaultScreen>
  );
}

/** Looks like a text field; a tap opens the system date or time picker. */
function PickField({ label, icon, value, onPress, flex }: { label: string; icon: IconName; value: string; onPress: () => void; flex: number }) {
  return (
    <View style={{ flex, marginBottom: 14 }}>
      <Text style={s.label}>{label}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${value}`} onPress={onPress} style={[s.input, st.pick]}>
        <Text style={{ flex: 1, fontSize: 16, color: C.text }}>{value}</Text>
        <Icon name={icon} size={20} color={C.muted} />
      </Pressable>
    </View>
  );
}

function TriChoice({ value, onChange }: { value: boolean | null; onChange: (v: boolean | null) => void }) {
  return (
    <View style={[s.row, { marginBottom: 6 }]}>
      <Chip label="Tak" selected={value === true} onPress={() => onChange(value === true ? null : true)} />
      <Chip label="Nie" selected={value === false} onPress={() => onChange(value === false ? null : false)} />
      <Chip label="Nie wiem" selected={value === null} onPress={() => onChange(null)} />
    </View>
  );
}

const st = themed(() => StyleSheet.create({
  pick: { flexDirection: 'row', alignItems: 'center' },
  subLabel: { fontSize: 14, fontWeight: '600', color: C.text, marginBottom: 6, marginTop: 6 },
  attachRow: { flexDirection: 'row', gap: 14, marginBottom: 10 },
  attachment: { flexDirection: 'row', alignItems: 'center', paddingLeft: 14, paddingRight: 6, paddingVertical: 6 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  nestedHead: { backgroundColor: C.bg, paddingLeft: 46, paddingTop: 12, paddingBottom: 4, fontSize: 12, fontWeight: '700', color: C.muted, textTransform: 'uppercase' },
  nestedField: { backgroundColor: C.bg, paddingLeft: 46, paddingRight: 14, paddingBottom: 10 },
}));
