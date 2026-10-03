/**
 * How serious an entry looks, offline and rule-based. Two hard rules:
 * - it never says something is fine: any recognised violence is at least "not normal",
 * - known danger signs (strangling, threats to kill, a weapon, sexual violence) always
 *   give the highest level. A language model could talk such a case down; rules cannot.
 */
import { findQuote, type HintContext } from './match';
import { CHILD_WORDS, INJURY, LOCKED_OUT, MONEY, ONLINE, PHYSICAL, PSYCHO, REPEAT, SPYING, STALKING, THREATS } from './rules';

export type SeverityLevel = 1 | 2 | 3;

export interface Severity {
  level: SeverityLevel;
  title: string;
  message: string;
  /** Short labels of what was recognised, shown as chips. */
  markers: string[];
}

const STRANGLING = ['dusil', 'dusi mnie', 'udusze', 'udusil', 'zlapal mnie za szyje', 'scisnal mnie za szyje', 'za gardlo'];
const KILL = ['zabije', 'zabic', 'zabijesz', 'zastrzele', 'podpale', 'nie przezyjesz'];
// Whole words only where a stem would also match harmless words (bronić się, nóżki).
const WEAPON = ['noz ', 'noz.', 'noz,', 'nozem', 'noza', 'nozyk', 'siekier', 'bronia', 'bron palna', 'pistolet', 'strzelb'];

const TEXT: Record<SeverityLevel, { title: string; message: string }> = {
  3: {
    title: 'To może zagrażać Twojemu życiu',
    message: 'Jeśli możesz, porozmawiaj dziś z Niebieską Linią. W zagrożeniu dzwoń pod 112.',
  },
  2: {
    title: 'To poważne',
    message: 'Nikt nie ma prawa Ci tego robić. Masz prawo do pomocy i ochrony.',
  },
  1: {
    title: 'To nie jest normalne',
    message: 'To, co opisujesz, ustawa nazywa przemocą. To nie Twoja wina.',
  },
};

export function assessSeverity(ctx: HintContext): Severity | null {
  const e = ctx.entry;
  // Trailing space lets whole-word stems like 'noz ' match at the very end too.
  const text = `${e.description} \n${e.injuriesDescription} `;
  const has = (stems: string[]) => findQuote(text, stems) !== null;

  const danger: string[] = [];
  if (has(STRANGLING)) danger.push('duszenie');
  if (has(KILL)) danger.push('groźba śmierci');
  if (has(WEAPON)) danger.push('broń / nóż');
  if (e.forms.includes('seksualna')) danger.push('przemoc seksualna');

  const serious: string[] = [];
  if (e.forms.includes('fizyczna') || has(PHYSICAL)) serious.push('przemoc fizyczna');
  if (e.injuries === true || has(INJURY)) serious.push('obrażenia');
  if (has(THREATS)) serious.push('groźby');
  if (has(STALKING)) serious.push('nękanie');
  if (has(LOCKED_OUT)) serious.push('odcięcie od domu');
  if (e.childrenPresent === true || has(CHILD_WORDS)) serious.push('dzieci przy tym były');
  const similar = ctx.history.filter((h) => h.forms.some((f) => e.forms.includes(f))).length;
  if (similar >= 2 || (e.forms.length > 0 && has(REPEAT))) serious.push('powtarza się');
  // A gun at home makes threats and physical violence deadly; with insults alone it is not a sign of danger to life.
  if (ctx.profile?.firearm === 'tak' && (serious.includes('przemoc fizyczna') || serious.includes('groźby'))) danger.push('broń palna w domu');

  const concern: string[] = [];
  if (e.forms.includes('psychiczna') || has(PSYCHO)) concern.push('przemoc psychiczna');
  if (e.forms.includes('ekonomiczna') || has(MONEY)) concern.push('przemoc ekonomiczna');
  if (e.forms.includes('elektroniczna') || has(ONLINE) || has(SPYING)) concern.push('kontrola, telefon, internet');
  if (e.forms.includes('inne') && concern.length === 0) concern.push('przemoc');

  const level: SeverityLevel | null = danger.length ? 3 : serious.length ? 2 : concern.length ? 1 : null;
  if (!level) return null;
  return { level, ...TEXT[level], markers: [...new Set([...danger, ...serious, ...concern])] };
}
