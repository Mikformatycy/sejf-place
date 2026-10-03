import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { buildReportModel, type ReportModel } from '@/report/model';
import { sharePackage, sharePdf } from '@/report/export';
import { Btn, C, Chip, Field, Icon, P, VaultScreen, s, type IconName } from '@/ui/kit';
import { themed } from '@/ui/theme';
import type { Profile } from '@/vault/types';
import { useSession } from '@/vault/session';

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
      <View style={st.tiles}>
        <Tile icon="document-text-outline" value={model.entries.length} label="wpisy" />
        <Tile icon="attach" value={model.counts.attachments} label="załączniki" />
        <Tile icon="shield-checkmark-outline" value={model.counts.stamped} label="ze znacznikiem czasu" color={C.ok} />
      </View>

      <View style={st.share}>
        <ShareBtn icon="document-text-outline" title="PDF" sub="raport" busy={busy === 'pdf'} disabled={!!busy || empty} onPress={() => setAsking('pdf')} />
        <ShareBtn icon="archive-outline" title="ZIP" sub="dowody + weryfikacja" busy={busy === 'zip'} disabled={!!busy || empty} onPress={() => setAsking('zip')} />
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
  const [firearm, setFirearm] = useState(initial.firearm);
  const [children, setChildren] = useState(initial.childrenCount);
  return (
    <Modal transparent animationType="slide" visible onRequestClose={onClose}>
      <Pressable style={st.backdrop} onPress={onClose} />
      <View style={st.sheet}>
        <ScrollView keyboardShouldPersistTaps="handled">
          <Text style={st.sheetTitle}>Do raportu (opcjonalnie)</Text>
          <Field label="Relacja z osobą stosującą przemoc" value={relation} onChangeText={setRelation} placeholder="np. mąż, były partner" />
          <Text style={st.sheetLabel}>Czy ta osoba ma broń palną?</Text>
          <View style={[s.row, { marginBottom: 10 }]}>
            {(['tak', 'nie', 'nie wiem'] as const).map((v) => (
              <Chip key={v} label={v} selected={firearm === v} onPress={() => setFirearm(firearm === v ? '' : v)} />
            ))}
          </View>
          <Field label="Liczba dzieci w domu" value={children} onChangeText={(v) => setChildren(v.replace(/\D/g, ''))} keyboardType="number-pad" />
          <Btn label="Generuj" onPress={() => onDone({ relation: relation.trim(), firearm, childrenCount: children })} />
        </ScrollView>
      </View>
    </Modal>
  );
}

function Tile({ icon, value, label, color = C.primary }: { icon: IconName; value: number | string; label: string; color?: string }) {
  return (
    // Icon and number only; the label is for screen readers.
    <View style={st.tile} accessible accessibilityLabel={`${label}: ${value}`}>
      <Icon name={icon} size={20} color={color} />
      <Text style={[st.tileValue, { color }]}>{value}</Text>
    </View>
  );
}

function ShareBtn(props: { icon: IconName; title: string; sub: string; busy: boolean; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Udostępnij ${props.title}`}
      onPress={props.onPress}
      disabled={props.disabled}
      style={({ pressed }) => [st.shareBtn, (pressed || props.disabled) && { opacity: 0.6 }]}
    >
      {props.busy ? <ActivityIndicator color="#fff" /> : <Icon name={props.icon} size={30} color="#fff" />}
      <Text style={st.shareTitle}>{props.title}</Text>
      <Text style={st.shareSub}>{props.sub}</Text>
    </Pressable>
  );
}

const st = themed(() => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  sheet: { backgroundColor: C.bg, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 18, paddingBottom: 32, maxHeight: '80%' },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: C.text, marginBottom: 12 },
  sheetLabel: { fontSize: 14, fontWeight: '600', color: C.text, marginBottom: 6 },
  tiles: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  tile: { flex: 1, backgroundColor: C.surface, borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: C.border },
  tileValue: { fontSize: 22, fontWeight: '800', marginTop: 4 },
  share: { flexDirection: 'row', gap: 10, marginTop: 4, marginBottom: 12 },
  shareBtn: { flex: 1, backgroundColor: C.primary, borderRadius: 14, paddingVertical: 18, alignItems: 'center' },
  shareTitle: { color: '#fff', fontSize: 18, fontWeight: '800', marginTop: 6 },
  shareSub: { color: '#DCE4F0', fontSize: 12, marginTop: 2 },
}));
