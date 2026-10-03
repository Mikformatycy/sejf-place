import type { ComponentType } from 'react';

import type { CoverId } from '@/covers/canonical';

import KsiazkiCover from './KsiazkiCover';
import KwiatkiCover from './KwiatkiCover';
import PrzepisyCover from './PrzepisyCover';
import type { CoverProps } from './shared';
import UrodzinyCover from './UrodzinyCover';
import WodaCover from './WodaCover';
import ZadaniaCover from './ZadaniaCover';

export const COVER_COMPONENTS: Record<CoverId, ComponentType<CoverProps>> = {
  przepisy: PrzepisyCover,
  zadania: ZadaniaCover,
  woda: WodaCover,
  urodziny: UrodzinyCover,
  ksiazki: KsiazkiCover,
  kwiatki: KwiatkiCover,
};

export type { CheckFn, CoverProps } from './shared';
