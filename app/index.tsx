import { Redirect } from 'expo-router';
import { View } from 'react-native';

import { CoverHost } from '@/screens/CoverHost';
import { useSession } from '@/vault/session';

export default function CoverScreen() {
  const initialized = useSession((s) => s.initialized);
  const coverId = useSession((s) => s.coverId);
  const unlocked = useSession((s) => s.unlocked);

  if (!initialized) return <Redirect href="/powitanie" />;
  // While the vault is open the cover is unmounted (no camera/torch running underneath),
  // and it comes back freshly mounted, i.e. in a clean state, after the vault locks.
  if (unlocked) return <View style={{ flex: 1, backgroundColor: '#FBF6F0' }} />;
  return <CoverHost key={coverId} coverId={coverId} />;
}
