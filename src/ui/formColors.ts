import type { ViolenceForm } from '@/vault/types';

import { isDark } from './theme';

type Tint = { fg: string; bg: string };

// One colour per kind of violence, so it is recognisable at a glance: physical orange, psychological
// pink (not violet: that is the AI's colour), sexual red, economic green…
const LIGHT: Record<ViolenceForm, Tint> = {
  fizyczna: { fg: '#D9822B', bg: '#FBF1E6' },
  psychiczna: { fg: '#D8578F', bg: '#FBEAF2' },
  seksualna: { fg: '#C0392B', bg: '#FBE9E7' },
  ekonomiczna: { fg: '#3E9A63', bg: '#EAF5EE' },
  elektroniczna: { fg: '#3A86C8', bg: '#EAF2FA' },
  inne: { fg: '#8A9099', bg: '#F1F2F4' },
};

const DARK: Record<ViolenceForm, Tint> = {
  fizyczna: { fg: '#E9A35E', bg: '#33271B' },
  psychiczna: { fg: '#EC8DB6', bg: '#36212C' },
  seksualna: { fg: '#E57368', bg: '#3A2220' },
  ekonomiczna: { fg: '#6CC48F', bg: '#1C2F24' },
  elektroniczna: { fg: '#73AEE3', bg: '#1C2A38' },
  inne: { fg: '#9BA2AC', bg: '#24282D' },
};

export function formColor(id: ViolenceForm): Tint {
  return (isDark() ? DARK : LIGHT)[id] ?? (isDark() ? DARK : LIGHT).inne;
}
