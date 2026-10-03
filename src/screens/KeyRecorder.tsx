import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { canonicalize, checkStrength, type CoverId } from '@/covers/canonical';
import { coverAction } from '@/covers/catalog';
import { COVER_COMPONENTS, type CheckFn } from '@/covers/ui';
import { useLatest } from '@/covers/ui/shared';
import { C } from '@/ui/kit';
import { themed } from '@/ui/theme';

/**
 * Shows the real cover with a banner and captures the user's chosen action twice.
 * Any other action inside the cover keeps working normally.
 */
export function KeyRecorder({
  coverId,
  actionId,
  onDone,
  onCancel,
}: {
  coverId: CoverId;
  actionId: string;
  onDone: (canonical: string) => void | Promise<void>;
  onCancel: () => void;
}) {
  const action = coverAction(coverId, actionId)!;
  const [phase, setPhase] = useState<'record' | 'confirm'>('record');
  const [message, setMessage] = useState<{ text: string; tone: 'info' | 'warn' | 'ok' } | null>(null);
  const first = useRef<string | null>(null);
  const phaseRef = useLatest(phase);
  // Once the key is confirmed, saving takes a moment: ignore every further action.
  const savingRef = useRef(false);
  const [saving, setSaving] = useState(false);

  const check: CheckFn = useCallback(
    async (act, value, target, opts) => {
      // Unfinished sequences are only for instant unlocking; record the finished one.
      if (savingRef.current) return true;
      if (act !== actionId || opts?.partial) return false;
      const strength = checkStrength(action.kind, value, action.alphabet);
      if (!strength.ok) {
        setMessage({ text: strength.message, tone: 'warn' });
        return true; // swallow the weak attempt so the cover does not change
      }
      const canonical = canonicalize(coverId, action.kind, { action: act, target, value });
      if (phaseRef.current === 'record') {
        first.current = canonical;
        setPhase('confirm');
        setMessage({ text: `${strength.message} Teraz powtórz.`, tone: 'ok' });
        return true;
      }
      if (canonical === first.current) {
        savingRef.current = true;
        setSaving(true);
        setMessage({ text: 'Zgadza się.', tone: 'ok' });
        try {
          await onDone(canonical);
        } catch (e) {
          savingRef.current = false;
          setSaving(false);
          setMessage({ text: `Nie udało się zapisać klucza: ${String(e)}`, tone: 'warn' });
        }
      } else {
        first.current = null;
        setPhase('record');
        setMessage({ text: 'To nie było to samo. Jeszcze raz od początku.', tone: 'warn' });
      }
      return true;
    },
    [action, actionId, coverId, onDone, phaseRef, savingRef],
  );

  const Cover = COVER_COMPONENTS[coverId];
  const tone = message?.tone ?? 'info';

  return (
    <View style={{ flex: 1 }}>
      <SafeAreaView edges={['top']} style={st.banner}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={st.step}>{phase === 'record' ? '1/2 · Wykonaj' : '2/2 · Powtórz'}</Text>
          <Pressable onPress={onCancel} hitSlop={10}>
            <Text style={st.cancel}>Anuluj</Text>
          </Pressable>
        </View>
        <Text style={st.howTo}>{action.howTo}</Text>
        {message ? (
          <Text style={[st.msg, { color: tone === 'warn' ? C.warn : tone === 'ok' ? C.ok : C.primary }]}>{message.text}</Text>
        ) : null}
      </SafeAreaView>
      <View style={{ flex: 1 }}>
        <Cover check={check} />
        {saving ? (
          <View style={st.overlay} pointerEvents="auto">
            <ActivityIndicator size="large" color={C.primary} />
            <Text style={st.overlayText}>Zapisuję klucz…</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const st = themed(() => StyleSheet.create({
  banner: { backgroundColor: '#FFFDF8', borderBottomWidth: 2, borderBottomColor: C.primary, paddingHorizontal: 14, paddingBottom: 10 },
  step: { flex: 1, fontSize: 15, fontWeight: '700', color: C.primary, paddingTop: 6 },
  cancel: { color: C.muted, fontSize: 15, paddingTop: 6 },
  howTo: { fontSize: 15, color: C.text, marginTop: 4, lineHeight: 21 },
  msg: { fontSize: 14, fontWeight: '600', marginTop: 6 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.85)', alignItems: 'center', justifyContent: 'center' },
  overlayText: { marginTop: 12, fontSize: 16, color: C.text, fontWeight: '600' },
}));
