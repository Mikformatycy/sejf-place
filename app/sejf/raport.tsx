import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { buildReportModel, type ReportModel } from '@/report/model';
import { sharePackage, sharePdf } from '@/report/export';
import { moneyAmounts } from '@/content/pieniadze';
import { formatOccurred } from '@/ui/format';
import { Btn, C, Field, Icon, P, VaultScreen, type IconName } from '@/ui/kit';
import { themed } from '@/ui/theme';
import type { EntryContent, Profile } from '@/vault/types';
import { useSession } from '@/vault/session';

/** One icon per kind of content in an entry, in a fixed order. */
function contentIcons(c: EntryContent): IconName[] {
  const kinds = new Set(c.attachments.map((a) => a.kind));
  const icons: (IconName | false)[] = [
    !!c.description && 'document-text-outline',
    moneyAmounts(c).length > 0 && 'cash-outline',
    (kinds.has('photo') || kinds.has('image')) && 'image-outline',
    kinds.has('audio') && 'mic-outline',
    kinds.has('document') && 'attach',
  ];
  return icons.filter((x): x is IconName => !!x);
}

/** "2026-09-01T..." -> "1.09" */
const dayMonth = (local: string) => `${Number(local.slice(8, 10))}.${local.slice(5, 7)}`;

const plural = (n: number, one: string, few: string, many: string) =>
  n === 1 ? one : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? few : many;

export default function Report() {
  const index = useSession((s) => s.index);
  const [model, setModel] = useState<ReportModel | null>(null);
  const [busy, setBusy] = useState<'pdf' | 'zip' | null>(null);
  // Optional details are asked for only when a report is about to be made, not kept in settings.
  const [asking, setAsking] = useState<'pdf' | 'zip' | null>(null);

  const entries = index?.entries;
  const profile = index?.profile;
  const aiSummary = index?.aiSummary;
  useEffect(() => {
    if (entries && profile) void buildReportModel(entries, profile, aiSummary).then(setModel);
  }, [entries, profile, aiSummary]);

  if (!index || !model) {
    return (
      <VaultScreen title="Eksport">
        <P muted>Przygotowuję…</P>
      </VaultScreen>
    );
  }
  // Approved AI sentences always go into the report, next to the original entries.
  const ai = index.aiSummary;
  const empty = model.entries.length === 0;
  const first = model.entries[0]?.content.occurredAt;
  const last = model.entries[model.entries.length - 1]?.content.occurredAt;
  const range = first && last ? `${dayMonth(first)} – ${dayMonth(last)}.${last.slice(0, 4)}` : '';
  // The preview shows each entry once, in its newest version (the report itself keeps every version).
  const edited = new Set(model.entries.map((e) => e.content.correctionOf).filter(Boolean));
  const current = model.entries.filter((e) => !edited.has(e.id));
  const files = current.reduce((n, e) => n + e.content.attachments.length, 0);
  const recent = current.slice(-4).reverse();
  const allStamped = !empty && model.counts.stamped >= model.entries.length;

  const run = async (kind: 'pdf' | 'zip') => {
    setBusy(kind);
    try {
      if (kind === 'pdf') {
        const r = await sharePdf(ai);
        if (!r.stamped) Alert.alert('Raport bez znacznika czasu', 'Nie udało się połączyć z serwerem. Wpisy mają własne znaczniki.');
      } else {
        await sharePackage(ai);
      }
    } catch (e) {
      Alert.alert('Nie udało się', String(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <VaultScreen title="Eksport">
      {/* A small preview of what the report contains, then one main action. */}
      <View style={st.preview}>
        <Text style={st.previewTitle}>
          Raport{range ? ` · ${range}` : ''}
        </Text>
        <Text style={st.previewSub}>
          {current.length} {plural(current.length, 'wpis', 'wpisy', 'wpisów')} · {files} {plural(files, 'załącznik', 'załączniki', 'załączników')}
        </Text>
        {recent.map((e) => (
          <View key={e.id} style={st.previewRow}>
            <Text style={st.previewDate} numberOfLines={1}>
              {formatOccurred(e.content.occurredAt).replace(/, \d\d:\d\d$/, '')}
            </Text>
            {/* What the entry holds, as icons: description, amount, photos, recordings, files. */}
            <View style={st.previewIcons}>
              {contentIcons(e.content).map((name) => (
                <Icon key={name} name={name} size={16} color={C.muted} />
              ))}
            </View>
          </View>
        ))}
      </View>

      <Btn label="Udostępnij raport PDF" busy={busy === 'pdf'} disabled={!!busy || empty} onPress={() => setAsking('pdf')} style={{ marginTop: 16 }} />
      <Pressable accessibilityRole="button" disabled={!!busy || empty} onPress={() => setAsking('zip')} style={st.zip} hitSlop={8}>
        {busy === 'zip' ? <ActivityIndicator color={C.primary} /> : <Text style={[st.zipText, empty && { opacity: 0.45 }]}>Paczka dowodów (ZIP)</Text>}
      </Pressable>
      <View style={st.stamps}>
        <Icon name={allStamped ? 'shield-checkmark' : 'hourglass-outline'} size={16} color={allStamped ? C.ok : C.warn} />
        <Text style={st.stampsText}>
          {allStamped ? 'Wszystkie wpisy ze znacznikiem czasu' : `${model.counts.stamped} z ${model.entries.length} ze znacznikiem czasu`}
        </Text>
      </View>

      {asking ? (
        <ProfileSheet
          initial={index.profile}
          onClose={() => setAsking(null)}
          onDone={async (p) => {
            const kind = asking;
            setAsking(null);
            await useSession.getState().update((idx) => {
              idx.profile = { ...idx.profile, ...p };
            });
            await run(kind);
          }}
        />
      ) : null}
    </VaultScreen>
  );
}

/** Optional details shown right before generating; all can be left empty. */
function ProfileSheet({
  initial,
  onClose,
  onDone,
}: {
  initial: Profile;
  onClose: () => void;
  onDone: (p: Pick<Profile, 'relation' | 'firearm' | 'childrenCount'>) => void;
}) {
  const [relation, setRelation] = useState(initial.relation);
  const [children, setChildren] = useState(initial.childrenCount);
  return (
    <Modal transparent animationType="slide" visible onRequestClose={onClose}>
      <Pressable style={st.backdrop} onPress={onClose} />
      <View style={st.sheet}>
        <ScrollView keyboardShouldPersistTaps="handled">
          <Text style={st.sheetTitle}>Do raportu (opcjonalnie)</Text>
          <Field label="Relacja z osobą stosującą przemoc" value={relation} onChangeText={setRelation} placeholder="np. mąż, były partner" />
          <Field label="Liczba dzieci w domu" value={children} onChangeText={(v) => setChildren(v.replace(/\D/g, ''))} keyboardType="number-pad" />
          <Btn label="Generuj" onPress={() => onDone({ relation: relation.trim(), firearm: '', childrenCount: children })} />
        </ScrollView>
      </View>
    </Modal>
  );
}



const st = themed(() => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  sheet: { backgroundColor: C.bg, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 18, paddingBottom: 32, maxHeight: '80%' },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: C.text, marginBottom: 12 },
  sheetLabel: { fontSize: 14, fontWeight: '600', color: C.text, marginBottom: 6 },
  preview: { backgroundColor: C.surface, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border, padding: 16 },
  previewTitle: { fontSize: 16, fontWeight: '700', color: C.text },
  previewSub: { fontSize: 13, color: C.muted, marginTop: 2, marginBottom: 8 },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
  previewDate: { fontSize: 13, color: C.text },
  previewIcons: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  zip: { alignItems: 'center', paddingVertical: 12 },
  zipText: { fontSize: 15, fontWeight: '600', color: C.primary },
  stamps: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4 },
  stampsText: { fontSize: 13, color: C.muted },
}));
