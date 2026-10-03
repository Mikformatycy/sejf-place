import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { FORMS, formLabel } from '@/content/formy';
import { amountTotal, formatAmount, moneyAmounts } from '@/content/pieniadze';
import { fileExt, formatOccurred, formatSeconds } from '@/ui/format';
import { C, Icon, IconBtn, P, VaultScreen } from '@/ui/kit';
import { formColor } from '@/ui/formColors';
import { themed } from '@/ui/theme';
import { stampNow } from '@/vault/actions';
import { recordingDurationMs, thumbnailUri, useDraft } from '@/vault/evidence';
import { useSession } from '@/vault/session';
import type { Attachment, Entry, ReportStamp } from '@/vault/types';

const NO_ENTRIES: Entry[] = [];
const NO_REPORTS: ReportStamp[] = [];
const DAY = 24 * 3600 * 1000;

/**
 * Entries saved since the last export, when it is time to remind about a backup:
 * the phone can be taken or broken, and without a copy the evidence is gone.
 */
function entriesWithoutBackup(entries: Entry[], reports: ReportStamp[]): number {
  const last = reports.reduce((m, r) => (r.createdAt > m ? r.createdAt : m), '');
  const fresh = entries.filter((e) => e.content && e.createdAt > last);
  if (fresh.length === 0) return 0;
  const oldest = Math.min(...fresh.map((e) => Date.parse(e.createdAt)));
  return fresh.length >= 3 || Date.now() - oldest > 7 * DAY ? fresh.length : 0;
}

export default function Timeline() {
  const entries = useSession((s) => s.index?.entries) ?? NO_ENTRIES;
  const reports = useSession((s) => s.index?.reports) ?? NO_REPORTS;
  const hasDraft = useDraft((d) => d.key === 'new' && (d.attachments.length > 0 || !!d.fields?.description));
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  const pending = entries.filter((e) => !e.tsa).length;
  const unsaved = useMemo(() => entriesWithoutBackup(entries, reports), [entries, reports]);
  const edited = useMemo(() => new Set(entries.map((e) => e.content?.correctionOf).filter(Boolean)), [entries]);
  const sorted = useMemo(
    () =>
      // Only the newest version of an edited entry; the older ones are in its history.
      entries.filter((e) => e.content && !edited.has(e.id)).sort((a, b) => {
        const ka = a.content?.occurredAt ?? a.createdAt;
        const kb = b.content?.occurredAt ?? b.createdAt;
        return kb.localeCompare(ka) || b.seq - a.seq;
      }),
    [entries, edited],
  );

  const fetchStamps = async () => {
    setBusy(true);
    setInfo(null);
    const r = await stampNow();
    setBusy(false);
    if (r.offline) setInfo('Brak internetu. Znaczniki pobiorą się przy następnym otwarciu.');
    else if (r.failed) setInfo('Serwer znaczników czasu nie odpowiada. Spróbuj później.');
  };

  return (
    <VaultScreen
      title="sejf-place"
      brand
      back={false}
      actions={[
        { icon: 'share-outline', label: 'Eksport', onPress: () => router.push('/sejf/raport') },
        { icon: 'call-outline', label: 'Telefony pomocowe', onPress: () => router.push('/sejf/telefony') },
        { icon: 'help-circle-outline', label: 'Pomoc', onPress: () => router.push('/sejf/pomoc') },
        { icon: 'settings-outline', label: 'Ustawienia', onPress: () => router.push('/sejf/ustawienia') },
      ]}
      overlay={
        <>
          {/* Straight to the camera or recorder; the form opens afterwards with the file attached. */}
          <View style={st.fabs}>
            <IconBtn
              icon="mic-outline"
              label="Nagranie"
              size={52}
              color={C.primary}
              bg={C.surface}
              raised
              onPress={() => router.push({ pathname: '/sejf/nagranie', params: { quick: '1' } })}
            />
            <IconBtn
              icon="camera-outline"
              label="Zdjęcie"
              size={52}
              color={C.primary}
              bg={C.surface}
              raised
              onPress={() => router.push({ pathname: '/sejf/aparat', params: { quick: '1' } })}
            />
            <IconBtn icon="add" label={hasDraft ? 'Dokończ wpis' : 'Nowy wpis'} size={64} color="#fff" bg={C.add} raised onPress={() => router.push('/sejf/nowy')} />
          </View>
        </>
      }
    >

      {pending > 0 && (
        <View style={st.pending}>
          <Icon name="hourglass-outline" size={18} color={C.warn} />
          <Text style={st.pendingText}>{pending} bez znacznika czasu</Text>
          <IconBtn icon="refresh" label="Pobierz znaczniki czasu" size={36} color={C.primary} onPress={fetchStamps} disabled={busy} />
        </View>
      )}
      {info ? <P muted>{info}</P> : null}
      {unsaved > 0 && (
        <View style={st.pending}>
          <Icon name="cloud-offline-outline" size={18} color={C.warn} />
          <Text style={st.pendingText}>{unsaved} bez kopii poza telefonem</Text>
          <IconBtn icon="share-outline" label="Wyślij kopię" size={36} color={C.primary} onPress={() => router.push('/sejf/raport')} />
        </View>
      )}

      <Text style={st.listLabel}>Wpisy ({sorted.length})</Text>
      {sorted.length === 0 ? (
        <View style={st.empty}>
          <Icon name="folder-open-outline" size={48} color={C.border} />
          <Text style={st.emptyText}>Brak wpisów</Text>
        </View>
      ) : (
        <View>
          {sorted.map((e) => (
            <EntryRow key={e.id} e={e} />
          ))}
        </View>
      )}
    </VaultScreen>
  );
}

const formIcon = (id: string) => FORMS.find((f) => f.id === id)?.icon ?? 'pricetag-outline';

/** One line per entry: the date and icons only, so nothing readable shows over a shoulder. */
function EntryRow({ e }: { e: Entry }) {
  // Only entries with content are listed (deleted ones stay in the chain and the report).
  const c = e.content!;
  const open = () => router.push({ pathname: '/sejf/wpis/[id]', params: { id: e.id } });
  const money = moneyAmounts(c).length > 0;
  const label = [formatOccurred(c.occurredAt, c.occurredApprox), ...c.forms.map(formLabel), c.description ? 'opis' : null, c.attachments.length ? `załączniki: ${c.attachments.length}` : null]
    .filter(Boolean)
    .join(', ');

  return (
    <Pressable
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [st.entry, pressed && { backgroundColor: C.bg }]}
    >
      <View style={st.head}>
        <Text style={st.date}>{formatOccurred(c.occurredAt, c.occurredApprox)}</Text>
        <Icon name={e.tsa ? 'shield-checkmark' : 'hourglass-outline'} size={18} color={e.tsa ? C.ok : C.warn} />
      </View>
      {/* Bottom line: what the entry holds (description, amount, files) on the left, kinds of violence on the right. */}
      {c.description || money || c.attachments.length > 0 || c.forms.length > 0 ? (
        <View style={st.bottom}>
          <View style={st.thumbs}>
            {c.description ? (
              <View style={[st.thumb, st.thumbIcon, { backgroundColor: C.txtBg }]}>
                <Icon name="document-text-outline" size={20} color={C.txt} />
              </View>
            ) : null}
            {money ? (
              <View style={[st.thumb, st.thumbIcon, st.amountTile, { backgroundColor: C.cashBg }]}>
                <Icon name="cash-outline" size={18} color={C.cash} />
                <Text style={[st.thumbTime, { color: C.cash }]} numberOfLines={1}>
                  {formatAmount(amountTotal(moneyAmounts(c)))}
                </Text>
              </View>
            ) : null}
            {c.attachments.slice(0, MAX_THUMBS).map((a) => (
              <Thumb key={a.id} a={a} />
            ))}
            {c.attachments.length > MAX_THUMBS ? <Text style={st.more}>+{c.attachments.length - MAX_THUMBS}</Text> : null}
          </View>
          <View style={st.forms}>
            {c.forms.map((f) => (
              <Icon key={f} name={formIcon(f)} size={20} color={formColor(f).fg} />
            ))}
          </View>
        </View>
      ) : null}
    </Pressable>
  );
}

const MAX_THUMBS = 4;


/** Same-size tile for every attachment: a photo preview, or an icon (with the length of a recording). */
function Thumb({ a }: { a: Attachment }) {
  const isImage = a.kind === 'photo' || a.kind === 'image';
  const [uri, setUri] = useState<string | null>(null);
  const [ms, setMs] = useState<number | null>(a.durationMs ?? null);
  useEffect(() => {
    if (!isImage && a.kind !== 'audio') return;
    let alive = true;
    // Decrypted in the background, one at a time (see thumbnailUri).
    if (isImage) {
      thumbnailUri(a)
        .then((u) => alive && setUri(u))
        .catch(() => undefined);
    } else {
      recordingDurationMs(a)
        .then((d) => alive && setMs(d))
        .catch(() => undefined);
    }
    return () => {
      alive = false;
    };
  }, [a, isImage]);
  if (!isImage) {
    return (
      <View style={[st.thumb, st.thumbIcon]}>
        <Icon name={a.kind === 'audio' ? 'mic' : 'document-outline'} size={18} color={C.primary} />
        {a.kind === 'audio' && ms ? <Text style={st.thumbTime}>{formatSeconds(Math.round(ms / 1000))}</Text> : null}
        {a.kind === 'document' && fileExt(a.name, a.mime) ? <Text style={st.thumbTime}>{fileExt(a.name, a.mime)}</Text> : null}
      </View>
    );
  }
  return (
    <View style={st.thumb}>
      {/* resizeMethod "resize" decodes a small bitmap instead of the full photo. */}
      {uri ? <Image source={{ uri }} style={st.thumbImg} resizeMethod="resize" /> : null}
    </View>
  );
}

const st = themed(() => StyleSheet.create({
  pending: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.warnSoft,
    borderRadius: 8,
    paddingLeft: 14,
    paddingRight: 4,
    paddingVertical: 4,
    marginBottom: 6,
  },
  // Same look as the other section headers, but closer to the top so the entries start higher.
  listLabel: { fontSize: 13, fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 2, marginBottom: 8 },
  empty: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyText: { color: C.muted, fontSize: 15 },
  pendingText: { flex: 1, color: C.warn, fontSize: 14, marginLeft: 8 },
  fabs: { position: 'absolute', right: 16, bottom: 20, flexDirection: 'row', alignItems: 'center', gap: 12 },
  // Each entry is its own card, with some air between them.
  entry: { backgroundColor: C.surface, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 },
  head: { flexDirection: 'row', alignItems: 'center' },
  date: { fontSize: 14, fontWeight: '700', color: C.text, marginRight: 6 },
  bottom: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 8 },
  thumbs: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  forms: { flexDirection: 'row', gap: 10, marginLeft: 'auto', paddingLeft: 8, paddingBottom: 4 },
  thumb: { width: 46, height: 46, borderRadius: 6, overflow: 'hidden', backgroundColor: C.border },
  thumbImg: { width: 46, height: 46 },
  thumbIcon: { alignItems: 'center', justifyContent: 'center', backgroundColor: C.primarySoft },
  amountTile: { width: undefined, minWidth: 46, paddingHorizontal: 6 },
  thumbTime: { fontSize: 11, fontWeight: '600', color: C.primary, marginTop: 2 },
  more: { fontSize: 13, color: C.muted, marginLeft: 4 },
}));
