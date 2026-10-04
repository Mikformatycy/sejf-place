import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { File } from 'expo-file-system';
import { useKeepAwake } from 'expo-keep-awake';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { formatSeconds } from '@/ui/format';
import { C, IconBtn, Info, Notice, VaultScreen } from '@/ui/kit';
import { themed } from '@/ui/theme';
import { ingestFile, useDraft } from '@/vault/evidence';
import { holdOpen, withExternalActivity } from '@/vault/quickExit';

/** While recording: the screen stays on and the inactivity lock waits (no touches during a long talk). */
function RecordingGuard() {
  useKeepAwake('nagranie');
  useEffect(() => holdOpen(), []);
  return null;
}

export default function RecordAudio() {
  const { quick } = useLocalSearchParams<{ quick?: string }>();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const state = useAudioRecorderState(recorder, 500);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const saved = useRef(false);

  const start = async () => {
    try {
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (e) {
      Alert.alert('Nie udało się rozpocząć nagrywania', String(e));
    }
  };

  // Recording starts as soon as the screen opens: in a hurry every tap counts.
  useEffect(() => {
    void (async () => {
      const p = await withExternalActivity(requestRecordingPermissionsAsync);
      setAllowed(p.granted);
      if (!p.granted) return;
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await start();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Leaving without saving: do not leave the unencrypted recording in the cache.
  useEffect(
    () => () => {
      if (saved.current) return;
      try {
        const uri = recorder.uri;
        const f = uri ? new File(uri) : null;
        if (f?.exists) f.delete();
      } catch {
        // Wiped on the next lock anyway.
      }
    },
    [recorder],
  );

  const stopAndSave = async () => {
    setSaving(true);
    const durationMs = state.durationMillis;
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false });
      if (recorder.uri) {
        const a = await ingestFile(recorder.uri, {
          kind: 'audio',
          name: `nagranie-${new Date().toISOString().replace(/[:.]/g, '-')}.m4a`,
          mime: 'audio/mp4',
          source: 'microphone',
          ...(durationMs ? { durationMs } : {}),
        });
        useDraft.getState().add(a);
        saved.current = true;
      }
      // Opened from the main screen: continue to the form with the recording attached.
      if (quick && saved.current) router.replace('/sejf/nowy');
      else router.back();
    } catch (e) {
      setSaving(false);
      Alert.alert('Nie udało się zapisać nagrania', String(e));
    }
  };

  return (
    <VaultScreen title="Nagranie">
      {state.isRecording ? <RecordingGuard /> : null}
      {allowed === false ? <Notice tone="warn">Brak dostępu do mikrofonu. Włącz go w ustawieniach telefonu.</Notice> : null}
      <View style={st.center}>
        <View style={[st.dot, state.isRecording && st.dotOn]} />
        <Text style={st.time}>{formatSeconds(Math.floor((state.durationMillis ?? 0) / 1000))}</Text>
        <Text style={st.state}>{state.isRecording ? 'Nagrywanie' : 'Gotowe'}</Text>
      </View>
      <View style={{ alignItems: 'center' }}>
        {state.isRecording ? (
          <IconBtn icon="stop" label="Zatrzymaj i zapisz" size={88} color="#fff" bg={C.danger} raised disabled={saving} onPress={stopAndSave} />
        ) : (
          <IconBtn icon="mic" label="Nagrywaj" size={88} color="#fff" bg={C.danger} raised disabled={!allowed} onPress={start} />
        )}
      </View>
      <View style={{ alignItems: 'center', marginTop: 16 }}>
        <Info text="Nagranie trafia tylko do sejfu, zaszyfrowane. Nagrywaj rozmowy, w których sama uczestniczysz (Pomoc → Nagrania jako dowód). Wyjście z aplikacji przerywa nagrywanie." />
      </View>
    </VaultScreen>
  );
}

const st = themed(() => StyleSheet.create({
  center: { alignItems: 'center', marginVertical: 30 },
  dot: { width: 22, height: 22, borderRadius: 11, backgroundColor: C.border },
  dotOn: { backgroundColor: C.danger },
  time: { fontSize: 52, fontWeight: '300', color: C.text, marginTop: 12 },
  state: { color: C.muted, marginTop: 6 },
}));
