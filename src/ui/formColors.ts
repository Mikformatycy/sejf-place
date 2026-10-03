import type { ViolenceForm } from '@/vault/types';

import { isDark } from './theme';

type Tint = { fg: string; bg: string };

// One colour per kind of violence, so it is recognisable at a glance: physical orange, economic green…
const LIGHT: Record<ViolenceForm, Tint> = {
  fizyczna: { fg: '#D9822B', bg: '#FBF1E6' },
  psychiczna: { fg: '#8A6BC4', bg: '#F3EFFA' },
  seksualna: { fg: '#CF5A7E', bg: '#FBEEF2' },
  ekonomiczna: { fg: '#3E9A63', bg: '#EAF5EE' },
  elektroniczna: { fg: '#3A86C8', bg: '#EAF2FA' },
  inne: { fg: '#8A9099', bg: '#F1F2F4' },
};

const DARK: Record<ViolenceForm, Tint> = {
  fizyczna: { fg: '#E9A35E', bg: '#33271B' },
  psychiczna: { fg: '#AE95DE', bg: '#2A2436' },
  seksualna: { fg: '#E58AA6', bg: '#35212A' },
  ekonomiczna: { fg: '#6CC48F', bg: '#1C2F24' },
  elektroniczna: { fg: '#73AEE3', bg: '#1C2A38' },
  inne: { fg: '#9BA2AC', bg: '#24282D' },
};

export function formColor(id: ViolenceForm): Tint {
  return (isDark() ? DARK : LIGHT)[id] ?? (isDark() ? DARK : LIGHT).inne;
}
