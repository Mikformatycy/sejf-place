import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import type { File } from 'expo-file-system';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { AiError } from '@/ai/client';
import { aiReady } from '@/ai/config';
import { assessEntry } from '@/ai/assessEntry';
import { formLabel } from '@/content/formy';
import type { Assessment } from '@/legal/assessment';
import { moneyAmounts, tagText } from '@/content/pieniadze';
import { formatBytes, formatInstant, formatOccurred, shortHash } from '@/ui/format';
import { SeverityCard } from '@/ui/SeverityCard';
import { AiBtn, C, Card, Icon, IconBtn, IconChip, Notice, P, PillBtn, VaultScreen, type HeaderAction } from '@/ui/kit';
import { themed } from '@/ui/theme';
import { deleteEntryContent } from '@/vault/actions';
import { attachmentTempFile, deleteTempFile } from '@/vault/evidence';
import { holdOpen } from '@/vault/quickExit';
import { useSession } from '@/vault/session';
import type { Attachment, Entry } from '@/vault/types';

export default function EntryDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const index = useSession((s) => s.index);
  const entry = index?.entries.find((e) => e.id === id);
  const [showHash, setShowHash] = useState(false);
  const [assessment, setAssessment] = useState<Assessment | null | undefined>(undefined);
  const [assessing, setAssessing] = useState(false);
  const [assessError, setAssessError] = useState<string | null>(null);

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

  const confirmDelete = () =>
    Alert.alert('Usunąć treść wpisu?', 'Opis i załączniki znikną na zawsze. W łańcuchu zostanie ślad, że wpis istniał.', [
      { text: 'Anuluj', style: 'cancel' },
      {
        text: 'Usuń',
        style: 'destructive',
        onPress: () => void deleteEntryContent(entry.id).catch((e) => Alert.alert('Nie udało się usunąć', String(e))),
      },
    ]);

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
    } catch (e) {
      setAssessError(e instanceof AiError ? e.message : 'Coś poszło nie tak.');
    } finally {
      release();
      setAssessing(false);
    }
  };

  const actions: HeaderAction[] = c
    ? [
        { icon: 'create-outline', label: 'Edytuj', onPress: () => router.push({ pathname: '/sejf/nowy', params: { correctionOf: entry.id } }) },
        { icon: 'trash-outline', label: 'Usuń treść wpisu', onPress: confirmDelete },
      ]
    : [];

  return (
    <VaultScreen title={c ? formatOccurred(c.occurredAt, c.occurredApprox) : 'Usunięty wpis'} actions={actions}>
      {c ? (
        <>
          <View style={st.chips}>
            {c.place ? <IconChip icon="location-outline" text={c.place} color={C.muted} bg={C.surface} /> : null}
            {c.forms.map((f) => (
              <IconChip key={f} icon="pricetag-outline" text={formLabel(f)} />
            ))}
            {c.isFirst ? <IconChip icon="flag-outline" text="pierwszy raz" color={C.accent} bg={C.accentSoft} /> : null}
            {c.injuries ? <IconChip icon="bandage-outline" text="obrażenia" color={C.danger} bg={C.accentSoft} /> : null}
            {c.childrenPresent ? <IconChip icon="people-outline" text="dzieci obecne" color={C.warn} bg={C.warnSoft} /> : null}
            {c.witnesses ? <IconChip icon="eye-outline" text={c.witnesses} color={C.ok} bg={C.okSoft} /> : null}
          </View>

          <Card>
            <P>{c.description || '(bez opisu)'}</P>
            {c.injuriesDescription ? <P muted style={{ marginTop: 6 }}>{c.injuriesDescription}</P> : null}
          </Card>
          {c.tags.length > 0 ? <P muted>{c.tags.map((t) => tagText(t, moneyAmounts(c))).join(' · ')}</P> : null}
          {aiItems.length > 0 ? (
            <View style={st.aiCard}>
              {aiItems.map((it, i) => (
                <P key={i}>{it.text}</P>
              ))}
            </View>
          ) : null}

          {c.attachments.map((a) => (
            <AttachmentView key={a.id} a={a} />
          ))}

          {assessment ? <SeverityCard a={assessment} /> : null}
          {assessment === null ? <P muted>Model nie rozpoznał tu przemocy.</P> : null}
          {assessError ? <Text style={st.error}>{assessError}</Text> : null}
          <View style={{ marginTop: 8 }}>
            <PillBtn label="Co mówi prawo" onPress={() => router.push({ pathname: '/sejf/prawo', params: { id: entry.id } })} />
            {assessment === undefined ? <AiBtn label="Jak poważne to jest?" busy={assessing} onPress={assess} /> : null}
            <AiBtn label="Uporządkuj z AI" onPress={() => router.push({ pathname: '/sejf/ai', params: { id: entry.id } })} />
          </View>
        </>
      ) : (
        <Notice>Treść usunięta {entry.deletedAt ? formatInstant(entry.deletedAt) : ''}. Suma kontrolna została w łańcuchu.</Notice>
      )}

      {/* History, like the timeline of a pull request: when it was added and each edit. */}
      <View style={st.history}>
        {versions.map((v, i) => {
          const current = v.id === entry.id;
          return (
            <Pressable
              key={v.id}
              onPress={() => (current ? setShowHash((s) => !s) : router.replace({ pathname: '/sejf/wpis/[id]', params: { id: v.id } }))}
              style={st.event}
            >
              <View style={[st.dot, { backgroundColor: v.tsa ? C.ok : C.warn }]} />
              <Text style={[st.eventText, current && { color: C.text, fontWeight: '600' }]}>
                {i === 0 ? 'Dodano' : 'Edytowano'} {formatInstant(v.createdAt).slice(0, 16)}
              </Text>
              <Icon name={v.tsa ? 'shield-checkmark' : 'hourglass-outline'} size={16} color={v.tsa ? C.ok : C.warn} />
            </Pressable>
          );
        })}
        {showHash ? (
          <View style={{ marginTop: 6 }}>
            {entry.tsa ? <Text style={st.hash}>Znacznik: {entry.tsa.tsaName.replace(/^.*CN=/, '')}</Text> : null}
            <Text style={st.hash}>SHA-256: {entry.hash}</Text>
            <Text style={st.hash}>Poprzedni: {entry.prevHash}</Text>
          </View>
        ) : null}
      </View>
    </VaultScreen>
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

function AttachmentView({ a }: { a: Attachment }) {
  const isImage = a.kind === 'photo' || a.kind === 'image';
  const [uri, setUri] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const player = useRef<AudioPlayer | null>(null);
  const file = useRef<File | null>(null);

  useEffect(() => {
    let alive = true;
    if (isImage) {
      attachmentTempFile(a)
        .then((f) => {
          if (alive) {
            file.current = f;
            setUri(f.uri);
          } else deleteTempFile(f);
        })
        .catch(() => alive && setFailed(true));
    }
    return () => {
      alive = false;
      player.current?.remove();
      player.current = null;
      deleteTempFile(file.current);
      file.current = null;
    };
  }, [a, isImage]);

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
    <Card>
      {isImage ? (
        uri ? (
          // resizeMethod "resize" decodes a downscaled bitmap instead of the full 12 MP photo.
          <Image source={{ uri }} style={st.image} resizeMode="contain" resizeMethod="resize" />
        ) : (
          <View style={[st.image, st.center]}>{failed ? <P muted>Nie udało się otworzyć</P> : <ActivityIndicator color={C.primary} />}</View>
        )
      ) : null}
      {a.kind === 'audio' ? (
        <View style={{ marginBottom: 8 }}>
          <IconBtn icon={playing ? 'pause' : 'play'} label={playing ? 'Pauza' : 'Odtwórz'} size={52} color="#fff" bg={C.primary} onPress={play} />
        </View>
      ) : null}
      <Text style={st.fileName}>{a.name}</Text>
      <Text style={st.meta}>
        {formatBytes(a.size)} · {SOURCE[a.source]} · {formatInstant(a.addedAt)}
      </Text>
      <Text style={st.hash}>SHA-256: {shortHash(a.sha256)}</Text>
    </Card>
  );
}

const SOURCE = { camera: 'aparat', microphone: 'mikrofon', gallery: 'galeria', files: 'plik' } as const;

const st = themed(() => StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 4 },
  history: { marginTop: 24, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border, paddingTop: 12 },
  event: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  eventText: { flex: 1, fontSize: 14, color: C.muted },
  aiCard: { borderLeftWidth: 3, borderLeftColor: C.ai, paddingLeft: 12, marginVertical: 8, gap: 6 },
  error: { fontSize: 14, color: C.danger, marginBottom: 8 },
  hash: { fontFamily: 'monospace', fontSize: 12, color: C.muted, marginTop: 6 },
  image: { width: '100%', height: 260, borderRadius: 6, backgroundColor: '#eee', marginBottom: 8 },
  center: { alignItems: 'center', justifyContent: 'center' },
  fileName: { fontSize: 14, fontWeight: '600', color: C.text },
  meta: { fontSize: 12, color: C.muted, marginTop: 2 },
}));
