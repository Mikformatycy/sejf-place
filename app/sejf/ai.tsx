import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { AiError, requestOrganize, type AiRequestEntry } from '@/ai/client';
import { makePseudonymizer } from '@/ai/pseudonymize';
import { checkItems, type CheckedItem } from '@/ai/validate';
import { formLabel } from '@/content/formy';
import { Btn, C, CheckRow, List, Notice, P, VaultScreen } from '@/ui/kit';
import { holdOpen } from '@/vault/quickExit';
import { useSession } from '@/vault/session';

type Phase = { name: 'sending' } | { name: 'error'; message: string } | { name: 'review'; model: string; items: CheckedItem[]; truncated: boolean };

/** Neutral wording of one entry by the AI; she approves sentence by sentence (see Pomoc → AI). */
export default function AiScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const index = useSession((st) => st.index);
  const entry = index?.entries.find((e) => e.id === id && e.content);
  const [phase, setPhase] = useState<Phase>({ name: 'sending' });
  const [accepted, setAccepted] = useState<Set<number>>(new Set());

  const pseudo = useMemo(() => makePseudonymizer(index?.profile.namesToHide ?? ''), [index?.profile.namesToHide]);

  const send = async () => {
    if (!entry?.content) return;
    const payload: AiRequestEntry[] = [
      {
        id: entry.id,
        date: entry.content.occurredAt,
        approx: entry.content.occurredApprox,
        forms: entry.content.forms.map(formLabel),
        description: pseudo.hide(entry.content.description),
      },
    ];
    // The model may take a minute; waiting is not inactivity.
    const release = holdOpen();
    try {
      const r = await requestOrganize(payload);
      const items = checkItems(r.items, payload.map((p) => ({ id: p.id, date: p.date, description: p.description })));
      setAccepted(new Set(items.map((it, i) => (it.flags.length === 0 ? i : -1)).filter((i) => i >= 0)));
      setPhase({ name: 'review', model: r.model, items, truncated: r.truncated });
    } catch (e) {
      setPhase({ name: 'error', message: e instanceof AiError ? e.message : 'Coś poszło nie tak.' });
    } finally {
      release();
    }
  };

  const retry = () => {
    setPhase({ name: 'sending' });
    void send();
  };

  // Opened from the entry's "Uporządkuj z AI": that tap is the request, so it starts right away.
  useEffect(() => {
    void Promise.resolve().then(send);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!index || !entry) return null;

  if (phase.name === 'sending') {
    return (
      <VaultScreen title="Uporządkuj z AI">
        <ActivityIndicator color={C.ai} style={{ marginTop: 40 }} />
      </VaultScreen>
    );
  }
  if (phase.name === 'error') {
    return (
      <VaultScreen title="Uporządkuj z AI">
        <Notice tone="warn">{phase.message}</Notice>
        <Btn kind="secondary" label="Spróbuj ponownie" onPress={retry} />
      </VaultScreen>
    );
  }

  // Sentences about this entry replace the ones saved for it before; others stay.
  const save = async () => {
    await useSession.getState().update((idx) => {
      const kept = (idx.aiSummary?.items ?? []).filter((it) => !(it.entryIds.length === 1 && it.entryIds[0] === entry.id));
      idx.aiSummary = {
        createdAt: new Date().toISOString(),
        model: phase.model,
        items: [...kept, ...phase.items.filter((_, i) => accepted.has(i)).map((it) => ({ entryIds: it.entryIds, text: pseudo.restore(it.text) }))],
      };
    });
    router.back();
  };

  return (
    <VaultScreen title="Sprawdź i zatwierdź" footer={<Btn label={`Zapisz (${accepted.size})`} onPress={save} />}>
      {phase.truncated ? <Notice tone="warn">Odpowiedź została ucięta.</Notice> : null}
      <List>
        {phase.items.map((it, i) => (
          <View key={i}>
            <CheckRow
              label={pseudo.restore(it.text)}
              checked={accepted.has(i)}
              onPress={() =>
                setAccepted((a) => {
                  const n = new Set(a);
                  if (n.has(i)) n.delete(i);
                  else n.add(i);
                  return n;
                })
              }
              last={i === phase.items.length - 1 && it.flags.length === 0}
            />
            {it.flags.map((f) => (
              <Text key={f} style={{ color: C.warn, fontSize: 13, paddingHorizontal: 14, paddingBottom: 8 }}>
                ⚠ {f}
              </Text>
            ))}
          </View>
        ))}
      </List>
      {phase.items.length === 0 ? <P muted>Brak zdań do zatwierdzenia.</P> : null}
    </VaultScreen>
  );
}
