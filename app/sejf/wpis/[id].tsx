import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import type { File } from 'expo-file-system';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Easing, Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { AiError, requestRewrite } from '@/ai/client';
import { aiReady } from '@/ai/config';
import { assessEntry } from '@/ai/assessEntry';
import { makePseudonymizer } from '@/ai/pseudonymize';
import { numbersIn } from '@/ai/validate';
import { FORMS, formLabel } from '@/content/formy';
import type { Assessment } from '@/legal/assessment';
import { moneyAmounts, tagText } from '@/content/pieniadze';
import { fileExt, formatBytes, formatInstant, formatOccurred, formatSeconds, shortHash } from '@/ui/format';
import { formColor } from '@/ui/formColors';
import { BAR_H, BarShell } from '@/ui/BottomBar';
import { LegalHints } from '@/ui/LegalHints';
import { SeverityCard } from '@/ui/SeverityCard';
import { C, Icon, Notice, P, VaultScreen, type HeaderAction, type IconName } from '@/ui/kit';
import { themed } from '@/ui/theme';
import { deleteEntryContent } from '@/vault/actions';
import { attachmentTempFile, deleteTempFile, recordingDurationMs, thumbnailUri } from '@/vault/evidence';
import { holdOpen } from '@/vault/quickExit';
import { useSession } from '@/vault/session';
import type { Attachment, Entry } from '@/vault/types';

export default function EntryDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const index = useSession((s) => s.index);
  const entry = index?.entries.find((e) => e.id === id);
  const [showHistory, setShowHistory] = useState(false);
  const [aiVersion, setAiVersion] = useState(false);
  const [assessment, setAssessment] = useState<Assessment | null | undefined>(undefined);
  const [assessing, setAssessing] = useState(false);
  const [assessError, setAssessError] = useState<string | null>(null);
  const [showLaw, setShowLaw] = useState(false);
  const [showAi, setShowAi] = useState(false);
  // Bumped when something opens at the bottom, so the screen scrolls down to it.
  const [reveal, setReveal] = useState(0);
  const [tidying, setTidying] = useState(false);

  if (!index || !entry) {
    return (
      <VaultScreen title="">
        <P>Nie znaleziono wpisu.</P>
      </VaultScreen>
    );
  }
  const c = entry.content;
  const versions = versionsOf(index.entries, entry);
  const aiItems = (index.aiSummary?.items ?? []).filter((it) => it.entryIds.includes(entry.id));
  // Details older entries may still carry (the form no longer asks for them).
  type Extra = { icon: IconName; text: string };
  const extras: Extra[] = [];
  if (c?.childrenPresent) extras.push({ icon: 'people-outline', text: 'Dzieci były obecne' });
  if (c?.injuries) extras.push({ icon: 'bandage-outline', text: 'Obrażenia' });
  if (c?.place) extras.push({ icon: 'location-outline', text: c.place });
  if (c?.witnesses) extras.push({ icon: 'eye-outline', text: c.witnesses });
  if (c?.isFirst) extras.push({ icon: 'flag-outline', text: 'Pierwszy taki raz' });

  const confirmDelete = () =>
    Alert.alert('Usunąć treść wpisu?', 'Opis i załączniki znikną na zawsze. W łańcuchu zostanie ślad, że wpis istniał.', [
      { text: 'Anuluj', style: 'cancel' },
      {
        text: 'Usuń',
        style: 'destructive',
        onPress: () => void deleteEntryContent(entry.id).catch((e) => Alert.alert('Nie udało się usunąć', String(e))),
      },
    ]);

  const toggleLaw = () => {
    if (!showLaw) setReveal((n) => n + 1);
    setShowLaw(!showLaw);
  };

  // First tap asks the AI; later taps only show or hide the answer it gave.
  const toggleAi = () => {
    if (showAi && !assessing) {
      setShowAi(false);
      return;
    }
    setShowAi(true);
    setReveal((n) => n + 1);
    if (assessment === undefined && !assessing) void assess();
  };

  const assess = async () => {
    if (!aiReady) {
      router.push('/sejf/ustawienia');
      return;
    }
    setAssessing(true);
    setAssessError(null);
    // The model may take a while; waiting is not inactivity.
    const release = holdOpen();
    try {
      setAssessment(await assessEntry(index, entry.id));
      setReveal((n) => n + 1);
    } catch (e) {
      setAssessError(e instanceof AiError ? e.message : 'Coś poszło nie tak.');
    } finally {
      release();
      setAssessing(false);
    }
  };

  // Corrected spelling and sentences, saved as the entry's AI version; her own text never changes.
  const tidy = async () => {
    if (!c) return;
    if (!aiReady) {
      router.push('/sejf/ustawienia');
      return;
    }
    setTidying(true);
    setAssessError(null);
    const release = holdOpen();
    try {
      const pseudo = makePseudonymizer(index.profile.namesToHide);
      const r = await requestRewrite(pseudo.hide(c.description));
      const text = pseudo.restore(r.text);
      // A number she never wrote (a date, an amount) means the model invented something.
      const own = new Set(numbersIn(c.description));
      if (numbersIn(text).some((n) => !own.has(n))) throw new AiError('AI dodało coś, czego nie było w opisie. Spróbuj ponownie.', 'server');
      await useSession.getState().update((idx) => {
        const kept = (idx.aiSummary?.items ?? []).filter((it) => !it.entryIds.includes(entry.id));
        idx.aiSummary = { createdAt: new Date().toISOString(), model: r.model, items: [...kept, { entryIds: [entry.id], text }] };
      });
      setAiVersion(true);
    } catch (e) {
      setAssessError(e instanceof AiError ? e.message : 'Coś poszło nie tak.');
    } finally {
      release();
      setTidying(false);
    }
  };

  const actions: HeaderAction[] = c
    ? [
        { icon: 'create-outline', label: 'Edytuj', onPress: () => router.push({ pathname: '/sejf/nowy', params: { correctionOf: entry.id } }) },
        { icon: 'trash-outline', label: 'Usuń treść wpisu', onPress: confirmDelete },
      ]
    : [];

  // The entry's tools stay in one place at the bottom.
  // The bar sits low and the round "głos rozsądku" rises above it; everything stays inside the
  // footer's own box, so nothing is clipped and the whole circle can be tapped.
  const footer = c ? (
    <BarShell center={<ReasonButton busy={assessing} onPress={toggleAi} />} centerTop={BAR_H / 2 - REASON_CY} centerWidth={REASON_W}>
      <Tool icon="scale-outline" label="Prawo" active={showLaw} onPress={toggleLaw} />
      <Tool icon="color-wand-outline" label="Uporządkuj" ai busy={tidying} onPress={tidy} />
    </BarShell>
  ) : undefined;

  const added = versions[0];
  const lastEdit = versions.length > 1 ? versions[versions.length - 1] : null;
  // "Added" repeats the date above when the entry was written right away; shown only if it was later.
  const addedOccurred = added.content?.occurredAt ?? c?.occurredAt;
  const addedLater = !addedOccurred || Math.abs(Date.parse(added.createdAt) - new Date(addedOccurred).getTime()) > 30 * 60_000;

  return (
    <VaultScreen title={c ? '' : 'Usunięty wpis'} actions={actions} footer={footer} bareFooter tabbed scrollToEnd={reveal}>

      {c ? (
        <>
          {/* When it happened: the one date on this screen (the header keeps only the tools). */}
          <View style={st.when}>
            <Icon name="calendar-outline" size={18} color={C.muted} />
            <Text style={st.whenText}>{formatOccurred(c.occurredAt, c.occurredApprox)}</Text>
          </View>
          <Text style={st.label}>Opis</Text>
          {aiItems.length > 0 ? (
            <View style={st.seg}>
              <SegBtn label="Mój opis" on={!aiVersion} onPress={() => setAiVersion(false)} />
              <SegBtn label="Wersja AI" ai on={aiVersion} onPress={() => setAiVersion(true)} />
            </View>
          ) : null}
          {aiVersion && aiItems.length > 0 ? (
            aiItems.map((it, i) => (
              <Text key={i} style={st.body}>
                {it.text}
              </Text>
            ))
          ) : (
            <Text style={st.body}>{c.description || '-'}</Text>
          )}
          {c.injuriesDescription ? <Text style={[st.body, { color: C.muted }]}>{c.injuriesDescription}</Text> : null}

          {c.attachments.length > 0 ? (
            <>
              <Text style={st.label}>Załączniki</Text>
              <Media list={c.attachments} />
            </>
          ) : null}

          {c.forms.length > 0 || extras.length > 0 ? <Text style={st.label}>Rodzaj przemocy</Text> : null}
          {c.forms.map((f) => {
            const form = FORMS.find((x) => x.id === f);
            const ticked = c.tags.filter((tag) => form?.examples.includes(tag));
            return (
              <View key={f} style={{ marginBottom: 6 }}>
                <View style={st.formRow}>
                  <Icon name={form?.icon ?? 'pricetag-outline'} size={20} color={formColor(f).fg} />
                  <Text style={st.formLabel}>{formLabel(f)}</Text>
                </View>
                {ticked.map((tag) => (
                  <View key={tag} style={st.tagRow}>
                    <Icon name="checkbox-outline" size={18} color={C.muted} />
                    <Text style={st.tagText}>{tagText(tag, moneyAmounts(c))}</Text>
                  </View>
                ))}
              </View>
            );
          })}
          {extras.map((x) => (
            <View key={x.text} style={st.formRow}>
              <Icon name={x.icon} size={20} color={C.muted} />
              <Text style={st.tagText}>{x.text}</Text>
            </View>
          ))}
        </>
      ) : (
        <Notice>Treść usunięta {entry.deletedAt ? formatInstant(entry.deletedAt) : ''}. Suma kontrolna została w łańcuchu.</Notice>
      )}

      {/* One quiet line; a tap shows every version (like the history of a pull request) and the checksums. */}
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: showHistory }} onPress={() => setShowHistory((v) => !v)} style={st.history}>
        <Icon name={entry.tsa ? 'shield-checkmark' : 'hourglass-outline'} size={16} color={entry.tsa ? C.ok : C.warn} />
        <Text style={st.historyText}>
          {[addedLater ? `Dodano ${shortStamp(added.createdAt)}` : null, lastEdit ? `edytowano ${shortStamp(lastEdit.createdAt)}` : null]
            .filter(Boolean)
            .join(' · ') || 'Znacznik czasu'}
        </Text>
      </Pressable>
      {showHistory ? (
        <View style={st.details}>
          {versions.length > 1
            ? versions.map((v, i) => (
                <Pressable
                  key={v.id}
                  disabled={v.id === entry.id}
                  onPress={() => router.replace({ pathname: '/sejf/wpis/[id]', params: { id: v.id } })}
                  style={st.version}
                >
                  <Text style={[st.historyText, v.id === entry.id ? { color: C.text, fontWeight: '600' } : { color: C.primary }]}>
                    {i === 0 ? 'Dodano' : 'Edytowano'} {shortStamp(v.createdAt)}
                  </Text>
                </Pressable>
              ))
            : null}
          {entry.tsa ? <Text style={st.hash}>Znacznik czasu: {entry.tsa.tsaName.replace(/^.*CN=/, '')}</Text> : null}
          <Text style={st.hash}>SHA-256: {entry.hash}</Text>
          <Text style={st.hash}>Poprzedni: {entry.prevHash}</Text>
          {c?.attachments.map((a) => (
            <Text key={a.id} style={st.hash}>
              {a.name} · {formatBytes(a.size)} · {SOURCE[a.source]} · {shortHash(a.sha256)}
            </Text>
          ))}
        </View>
      ) : null}
      {/* Answers open here, under the timestamp; the same button closes them again. */}
      {showLaw && c ? (
        <View style={[st.panel, st.lawPanel]} accessibilityLabel="Co mówi prawo">
          <View style={st.panelHead}>
            <Icon name="scale-outline" size={20} color={C.primary} />
          </View>
          <LegalHints entryId={entry.id} />
        </View>
      ) : null}
      {showAi && c ? (
        <View style={[st.panel, st.aiPanel]} accessibilityLabel="Głos rozsądku">
          <View style={st.panelHead}>
            <Icon name="sparkles" size={20} color={C.ai} />
            {assessing ? <ActivityIndicator color={C.ai} /> : null}
          </View>
          {assessment ? <SeverityCard a={assessment} /> : null}
          {assessment === null ? <P muted>Model nie rozpoznał tu przemocy.</P> : null}
          {assessError ? <Text style={st.error}>{assessError}</Text> : null}
        </View>
      ) : null}
      <View style={{ height: REASON_CY - BAR_H / 2 + 4 }} />
    </VaultScreen>
  );
}

/** "3.10, 16:55"; the year only when it is not this year. */
function shortStamp(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  const year = d.getFullYear() === new Date().getFullYear() ? '' : `.${d.getFullYear()}`;
  return `${d.getDate()}.${d.getMonth() + 1}${year}, ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Bottom-bar tool: icon above a short label; AI tools in their own colour. */
function Tool({ icon, label, onPress, ai, busy, iconOnly, active }: { icon: IconName; label: string; onPress: () => void; ai?: boolean; busy?: boolean; iconOnly?: boolean; active?: boolean }) {
  const color = ai ? C.ai : C.primary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={busy}
      style={({ pressed }) => [st.tool, pressed && { backgroundColor: C.bg }]}
    >
      <View style={[st.toolPill, active && { backgroundColor: ai ? C.aiSoft : C.primarySoft }]}>
        {busy ? <ActivityIndicator color={color} /> : <Icon name={icon} size={iconOnly ? 26 : 22} color={color} />}
      </View>
      {iconOnly ? null : <Text style={[st.toolText, { color }]}>{label}</Text>}
    </Pressable>
  );
}

const REASON = 'GŁOS ROZSĄDKU';
const REASON_D = 80; // diameter of the button
const REASON_W = 140; // box around it, with room for the lettering
const REASON_CX = REASON_W / 2;
const ARC_R = 54; // radius of the lettering, over the button
const REASON_CY = ARC_R + 12; // room for the lettering above the circle
const REASON_H = REASON_CY + REASON_D / 2 + 2;
const ARC_SPAN = 140; // degrees the lettering covers, centred on the top

/**
 * The AI's opinion of the entry: a big round button that rises above the bar, with
 * "głos rozsądku" written along the bottom of its rim (each letter placed and turned on the arc).
 * It squashes a little when pressed and sends out a soft pulse while the AI thinks.
 */
function ReasonButton({ busy, onPress }: { busy: boolean; onPress: () => void }) {
  const chars = [...REASON];
  const step = ARC_SPAN / (chars.length - 1);
  const [scale] = useState(() => new Animated.Value(1));
  const [pulse] = useState(() => new Animated.Value(0));

  // Native-driver animations only (transform and opacity), so they cost the JS thread nothing.
  useEffect(() => {
    if (!busy) {
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 1100, easing: Easing.out(Easing.quad), useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [busy, pulse]);

  const press = (to: number) => Animated.spring(scale, { toValue: to, friction: to < 1 ? 6 : 3, tension: 160, useNativeDriver: true }).start();

  return (
    <View style={st.reason}>
      {chars.map((ch, i) => {
        // Along the top of the circle, left to right, each letter tilted to follow the curve.
        const deg = -ARC_SPAN / 2 + i * step;
        const rad = (deg * Math.PI) / 180;
        return (
          <Text
            key={i}
            importantForAccessibility="no"
            style={[
              st.arcChar,
              { left: REASON_CX - 7 + ARC_R * Math.sin(rad), top: REASON_CY - 9 - ARC_R * Math.cos(rad), transform: [{ rotate: `${deg}deg` }] },
            ]}
          >
            {ch}
          </Text>
        );
      })}
      <Animated.View
        pointerEvents="none"
        style={[
          st.reasonCircle,
          st.reasonHalo,
          { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.45] }) }] },
        ]}
      />
      <Animated.View style={[st.reasonCircle, { transform: [{ scale }] }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Głos rozsądku: jak poważne to jest"
          onPress={onPress}
          onPressIn={() => press(0.88)}
          onPressOut={() => press(1)}
          disabled={busy}
          style={st.reasonBtn}
        >
          {busy ? <ActivityIndicator color="#fff" /> : <Icon name="sparkles" size={36} color="#fff" />}
        </Pressable>
      </Animated.View>
    </View>
  );
}

function SegBtn({ label, on, ai, onPress }: { label: string; on: boolean; ai?: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: on }}
      onPress={onPress}
      style={[st.segBtn, on && { backgroundColor: ai ? C.aiSoft : C.primarySoft }]}
    >
      <Text style={[st.segText, { color: ai ? C.ai : on ? C.primary : C.muted }]}>{label}</Text>
    </Pressable>
  );
}

/** All versions of an entry, oldest first: follows "edit of" links back and forward. */
function versionsOf(entries: Entry[], entry: Entry): Entry[] {
  const chain = [entry];
  let back = entry;
  for (;;) {
    const prev = entries.find((e) => e.id === back.content?.correctionOf);
    if (!prev || chain.includes(prev)) break;
    chain.unshift(prev);
    back = prev;
  }
  let fwd = entry;
  for (;;) {
    const next = entries.find((e) => e.content?.correctionOf === fwd.id);
    if (!next || chain.includes(next)) break;
    chain.push(next);
    fwd = next;
  }
  return chain;
}

const isImage = (a: Attachment) => a.kind === 'photo' || a.kind === 'image';

/** Photos as a grid of squares (a tap opens one full screen), recordings as a play bar, files as tiles. */
function Media({ list }: { list: Attachment[] }) {
  const [viewing, setViewing] = useState<string | null>(null);
  const images = list.filter(isImage);
  const audio = list.filter((a) => a.kind === 'audio');
  const files = list.filter((a) => a.kind === 'document');
  return (
    <View style={st.media}>
      {images.length > 0 ? (
        <View style={st.grid}>
          {images.map((a, i) => (
            <PhotoTile key={a.id} a={a} last={i % 3 === 2} onOpen={setViewing} />
          ))}
        </View>
      ) : null}
      {audio.map((a) => (
        <AudioBar key={a.id} a={a} />
      ))}
      {files.length > 0 ? (
        <View style={st.grid}>
          {files.map((a, i) => (
            <View key={a.id} style={[st.tile, st.fileTile, i % 3 === 2 && { marginRight: 0 }]}>
              <Icon name="document-outline" size={26} color={C.primary} />
              <Text style={st.ext}>{fileExt(a.name, a.mime)}</Text>
            </View>
          ))}
        </View>
      ) : null}
      <Modal visible={viewing !== null} transparent animationType="fade" onRequestClose={() => setViewing(null)}>
        <Pressable style={st.viewer} onPress={() => setViewing(null)} accessibilityLabel="Zamknij zdjęcie">
          {viewing ? <Image source={{ uri: viewing }} style={{ flex: 1 }} resizeMode="contain" /> : null}
        </Pressable>
      </Modal>
    </View>
  );
}

function PhotoTile({ a, last, onOpen }: { a: Attachment; last: boolean; onOpen: (uri: string) => void }) {
  const [uri, setUri] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    // Same decrypted copy as on the entry list, kept until the vault locks.
    thumbnailUri(a)
      .then((u) => alive && setUri(u))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [a]);
  return (
    <Pressable accessibilityRole="imagebutton" accessibilityLabel="Zdjęcie" onPress={() => uri && onOpen(uri)} style={[st.tile, last && { marginRight: 0 }]}>
      {uri ? <Image source={{ uri }} style={st.tileImg} resizeMethod="resize" /> : <ActivityIndicator color={C.primary} />}
    </Pressable>
  );
}

/** A recording, like a voice message: play / pause and its length. */
function AudioBar({ a }: { a: Attachment }) {
  const [playing, setPlaying] = useState(false);
  const [ms, setMs] = useState<number | null>(a.durationMs ?? null);
  const player = useRef<AudioPlayer | null>(null);
  const file = useRef<File | null>(null);

  useEffect(() => {
    let alive = true;
    recordingDurationMs(a)
      .then((d) => alive && setMs(d))
      .catch(() => undefined);
    return () => {
      alive = false;
      player.current?.remove();
      player.current = null;
      deleteTempFile(file.current);
      file.current = null;
    };
  }, [a]);

  const play = async () => {
    if (playing) {
      player.current?.pause();
      setPlaying(false);
      return;
    }
    try {
      if (!player.current) {
        const f = await attachmentTempFile(a);
        file.current = f;
        const p = createAudioPlayer(f.uri);
        p.addListener('playbackStatusUpdate', (status) => {
          if (!status.didJustFinish) return;
          setPlaying(false);
          void p.seekTo(0);
        });
        player.current = p;
      }
      player.current.play();
      setPlaying(true);
    } catch (e) {
      Alert.alert('Nie udało się odtworzyć', String(e));
    }
  };

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={playing ? 'Pauza' : 'Odtwórz nagranie'} onPress={play} style={st.audio}>
      <View style={st.play}>
        <Icon name={playing ? 'pause' : 'play'} size={20} color="#fff" />
      </View>
      <Icon name="mic-outline" size={18} color={C.muted} />
      <Text style={st.audioTime}>{ms ? formatSeconds(Math.round(ms / 1000)) : 'Nagranie'}</Text>
    </Pressable>
  );
}

const SOURCE = { camera: 'aparat', microphone: 'mikrofon', gallery: 'galeria', files: 'plik' } as const;

const st = themed(() => StyleSheet.create({
  label: { fontSize: 13, color: C.muted, marginTop: 18, marginBottom: 6 },
  when: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  whenText: { fontSize: 20, fontWeight: '700', color: C.text },
  body: { fontSize: 16, lineHeight: 23, color: C.text, marginBottom: 4 },
  seg: { flexDirection: 'row', alignSelf: 'flex-start', borderWidth: StyleSheet.hairlineWidth, borderColor: C.border, borderRadius: 8, overflow: 'hidden', marginBottom: 8 },
  segBtn: { paddingHorizontal: 12, paddingVertical: 5 },
  segText: { fontSize: 13, fontWeight: '600' },
  formRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 36 },
  formLabel: { flex: 1, fontSize: 16, fontWeight: '600', color: C.text },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 30, minHeight: 30 },
  tagText: { flex: 1, fontSize: 15, color: C.text },
  history: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 24, paddingVertical: 6 },
  historyText: { fontSize: 13, color: C.muted },
  details: { paddingLeft: 22, paddingBottom: 8 },
  version: { paddingVertical: 4 },
  reason: { width: REASON_W, height: REASON_H },
  arcChar: { position: 'absolute', width: 14, textAlign: 'center', fontSize: 11, fontWeight: '700', color: C.ai },
  reasonCircle: { position: 'absolute', top: REASON_CY - REASON_D / 2, left: REASON_CX - REASON_D / 2, width: REASON_D, height: REASON_D, borderRadius: REASON_D / 2 },
  reasonHalo: { backgroundColor: C.ai },
  reasonBtn: { flex: 1, borderRadius: REASON_D / 2, backgroundColor: C.ai, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: C.aiSoft, elevation: 5, shadowColor: C.ai, shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  tool: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, paddingVertical: 8, borderRadius: 8 },
  toolText: { fontSize: 12, fontWeight: '600' },
  media: { marginTop: 4, marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  tile: { width: '32%', aspectRatio: 1, marginRight: '2%', marginBottom: 6, borderRadius: 8, overflow: 'hidden', backgroundColor: C.border, alignItems: 'center', justifyContent: 'center' },
  tileImg: { width: '100%', height: '100%' },
  fileTile: { backgroundColor: C.primarySoft },
  ext: { fontSize: 12, fontWeight: '700', color: C.primary, marginTop: 4 },
  audio: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.surface, borderRadius: 26, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border, padding: 6, paddingRight: 16, marginBottom: 8, alignSelf: 'flex-start' },
  play: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  audioTime: { fontSize: 15, fontWeight: '600', color: C.text },
  viewer: { flex: 1, backgroundColor: '#000' },
  panel: { marginTop: 12, gap: 8 },
  // Each answer in its own colour: the law in the app's blue, the AI in violet.
  lawPanel: { backgroundColor: C.primarySoft, borderRadius: 12, padding: 12 },
  aiPanel: { backgroundColor: C.aiSoft, borderRadius: 12, padding: 12 },
  panelHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toolPill: { width: 56, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  error: { fontSize: 14, color: C.danger, marginBottom: 8 },
  hash: { fontFamily: 'monospace', fontSize: 12, color: C.muted, marginTop: 6 },
}));
