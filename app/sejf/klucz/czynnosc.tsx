import { router, useLocalSearchParams } from 'expo-router';

import type { CoverId } from '@/covers/canonical';
import { ActionPicker, KEY_IOS_NOTE } from '@/screens/CoverPicker';
import { P, VaultScreen } from '@/ui/kit';

export default function ChangeAction() {
  const { cover } = useLocalSearchParams<{ cover: CoverId }>();
  return (
    <VaultScreen title="Nowy klucz">
      {KEY_IOS_NOTE ? <P muted>{KEY_IOS_NOTE.trim()}</P> : null}
      <ActionPicker coverId={cover} onPick={(action) => router.push({ pathname: '/sejf/klucz/nagraj', params: { cover, action } })} />
    </VaultScreen>
  );
}
