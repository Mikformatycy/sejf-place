import { router } from 'expo-router';
import { useCallback, useRef } from 'react';

import { canonicalize, type CoverId } from '@/covers/canonical';
import { coverAction } from '@/covers/catalog';
import { COVER_COMPONENTS, type CheckFn } from '@/covers/ui';
import { keyManager, useSession } from '@/vault/session';

/**
 * Renders the active cover. Every candidate action is checked against the key;
 * on a match the vault opens and the cover is told not to apply the change.
 * `onBusy` reports the slow key derivation; only the onboarding test shows it, because
 * on the everyday cover any visible reaction would give the key away.
 */
export function CoverHost({
  coverId,
  onUnlocked,
  onBusy,
}: {
  coverId: CoverId;
  onUnlocked?: () => void;
  onBusy?: (busy: boolean) => void;
}) {
  const unlocking = useRef(false);

  const check: CheckFn = useCallback(
    async (action, value, target) => {
      const a = coverAction(coverId, action);
      if (!a || unlocking.current) return false;
      const canonical = canonicalize(coverId, a.kind, { action, target, value });
      if (!keyManager.prefilter(canonical)) return false;
      unlocking.current = true;
      onBusy?.(true);
      try {
        const masterKey = await keyManager.tryUnlock(canonical);
        if (!masterKey) return false;
        // Re-wrap vaults created with older KDF parameters. Work on a copy: a quick exit
        // wipes the session key, and wrapping a wiped key would destroy the vault.
        if (keyManager.needsKdfUpgrade()) {
          const copy = masterKey.slice();
          void keyManager
            .setSecret(copy, canonical)
            .catch((e) => console.log(`[unlock] kdf upgrade failed: ${String(e)}`))
            .finally(() => copy.fill(0));
        }
        await useSession.getState().unlock(masterKey);
        if (onUnlocked) onUnlocked();
        else router.push('/sejf');
        return true;
      } catch (e) {
        console.log(`[unlock] error: ${e instanceof Error ? e.message : String(e)}`);
        return false;
      } finally {
        unlocking.current = false;
        onBusy?.(false);
      }
    },
    [coverId, onUnlocked, onBusy],
  );

  const Cover = COVER_COMPONENTS[coverId];
  return <Cover check={check} />;
}
