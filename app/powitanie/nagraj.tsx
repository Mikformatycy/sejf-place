import { router, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { Alert } from 'react-native';

import type { CoverId } from '@/covers/canonical';
import { KeyRecorder } from '@/screens/KeyRecorder';
import { beginFirstRun, endFirstRun, mayCreateVault } from '@/screens/setupFlow';
import { emptyIndex } from '@/vault/types';
import { keyManager, useSession, vaultStore } from '@/vault/session';

export default function RecordKey() {
  const { cover, action } = useLocalSearchParams<{ cover: CoverId; action: string }>();

  const onDone = useCallback(
    async (canonical: string) => {
      if (!mayCreateVault()) {
        Alert.alert('Nie można utworzyć', 'Teczka już istnieje na tym telefonie.');
        router.replace('/');
        return;
      }
      // Claim the one-time right to create a vault before the slow key derivation starts.
      endFirstRun();
      let masterKey: Uint8Array;
      try {
        masterKey = await keyManager.initialize(canonical);
      } catch (e) {
        // Nothing was written, so the user may simply try again.
        beginFirstRun(keyManager.isInitialized());
        throw e;
      }
      await vaultStore.saveIndex(masterKey, emptyIndex(new Date().toISOString()));
      await useSession.getState().setCover(cover);
      useSession.getState().markInitialized();
      // Lock right away: the next step tests the key "for real" from a clean cover.
      masterKey.fill(0);
      router.replace({ pathname: '/powitanie/sprawdz', params: { cover } });
    },
    [cover],
  );

  return <KeyRecorder coverId={cover} actionId={action} onDone={onDone} onCancel={() => router.back()} />;
}
