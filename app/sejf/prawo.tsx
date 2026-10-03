import { useLocalSearchParams } from 'expo-router';

import { VaultScreen } from '@/ui/kit';
import { LegalHints } from '@/ui/LegalHints';

/** Kept as a route for old links; the entry view now shows the same list in place. */
export default function LegalScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <VaultScreen title="Co mówi prawo">
      <LegalHints entryId={id} />
    </VaultScreen>
  );
}
