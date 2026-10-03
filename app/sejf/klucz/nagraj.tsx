import { router, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { Alert } from 'react-native';

import type { CoverId } from '@/covers/canonical';
import { coverInfo } from '@/covers/catalog';
import { KeyRecorder } from '@/screens/KeyRecorder';
import { keyManager, requireMasterKey, useSession } from '@/vault/session';

export default function RecordNewKey() {
  const { cover, action } = useLocalSearchParams<{ cover: CoverId; action: string }>();

  const onDone = useCallback(
    async (canonical: string) => {
      // Wrap a copy: a quick exit during the slow key derivation zeroes the session key,
      // and wrapping a zeroed key would make the vault impossible to open.
      const copy = requireMasterKey().slice();
      try {
        await keyManager.setSecret(copy, canonical);
      } finally {
        copy.fill(0);
      }
      await useSession.getState().setCover(cover);
      Alert.alert(
        'Zapisano nowy klucz',
        `Od teraz Teczkę otwiera tylko nowa czynność w przykrywce „${coverInfo(cover).label}”. Poprzedni klucz już nie działa.`,
      );
      router.dismissTo('/sejf/ustawienia');
    },
    [cover],
  );

  return <KeyRecorder coverId={cover} actionId={action} onDone={onDone} onCancel={() => router.back()} />;
}
