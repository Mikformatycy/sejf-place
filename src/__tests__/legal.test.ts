import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { legalHints, type HintEntry } from '@/legal/hints';
import { fold } from '@/legal/match';
import { RULES } from '@/legal/rules';
import { combineAssessment } from '@/legal/assessment';
import { assessSeverity } from '@/legal/severity';

const entry = (over: Partial<HintEntry> = {}): HintEntry => ({
  description: '',
  forms: [],
  tags: [],
  injuries: null,
  injuriesDescription: '',
  childrenPresent: null,
  witnesses: '',
  attachmentKinds: [],
  ...over,
});

const ids = (e: HintEntry, extra: Partial<Parameters<typeof legalHints>[0]> = {}) =>
  legalHints({ entry: e, history: [], ...extra }).map((h) => h.id);

describe('offline legal hints', () => {
  it('names economic violence from her own words, quoting them', () => {
    const hints = legalHints({ entry: entry({ description: 'Wczoraj zabrał mi kartę i powiedział, że nie dostanę pieniędzy.' }), history: [] });
    const eco = hints.find((h) => h.id === 'def-ekonomiczna');
    expect(eco?.law).toContain('lit. d');
    expect(eco?.reasons[0]).toBe('Napisałaś: „Wczoraj zabrał mi kartę i powiedział, że nie dostanę pieniędzy”');
  });

  it('ignores a negated phrase', () => {
    expect(ids(entry({ description: 'Tym razem nie groził, tylko krzyczał.' }))).not.toContain('kk-190');
    expect(ids(entry({ description: 'Groził, że mnie zabije.' }))).toEqual(expect.arrayContaining(['kk-190', 'ochrona']));
  });

  it('points to abuse (art. 207) only when it repeats', () => {
    const once = entry({ forms: ['psychiczna'], description: 'Wyzywał mnie.' });
    expect(ids(once)).not.toContain('kk-207');
    expect(ids(once, { history: [entry({ forms: ['psychiczna'] })] })).toContain('kk-207');
    expect(ids(entry({ forms: ['psychiczna'], description: 'Znowu mnie wyzywał.' }))).toContain('kk-207');
  });

  it('suggests protection and a medical certificate after injuries', () => {
    const got = ids(entry({ forms: ['fizyczna'], injuries: true, description: 'Popchnął mnie na szafę.' }));
    expect(got[0]).toBe('ochrona');
    expect(got).toEqual(expect.arrayContaining(['lekarz', 'kk-217', 'def-fizyczna', 'niebieska-karta']));
  });

  it('family-law money hints only for spouses', () => {
    const e = entry({ forms: ['ekonomiczna'] });
    expect(ids(e, { profile: { relation: 'mąż', firearm: '' } })).toContain('kro-28');
    expect(ids(e, { profile: { relation: 'były partner', firearm: '' } })).not.toContain('kro-28');
  });

  it('shows nothing for an unrelated note', () => {
    expect(ids(entry({ description: 'Kupiłam chleb.' }))).toEqual([]);
  });

  it('fold keeps one character per character, so quotes line up', () => {
    const s = 'Żółć ŁĄKA zażółć';
    expect(fold(s)).toBe('zolc laka zazolc');
    expect(fold(s)).toHaveLength(s.length);
  });

  it('cites only provisions that are in the verified legal research', () => {
    const research = readFileSync(join(__dirname, '..', '..', 'docs', 'research-prawny.md'), 'utf8');
    for (const rule of RULES) {
      for (const [, article] of rule.law.matchAll(/art\. (\d+[a-z¹]*)/g)) {
        expect([rule.id, research.includes(`Art. ${article}`) || research.includes(`art. ${article}`)]).toEqual([rule.id, true]);
      }
    }
  });
});

describe('severity', () => {
  const level = (e: HintEntry, extra: Partial<Parameters<typeof assessSeverity>[0]> = {}) =>
    assessSeverity({ entry: e, history: [], ...extra })?.level ?? null;

  it('always treats strangling, threats to kill and weapons as the highest level', () => {
    expect(level(entry({ description: 'Złapał mnie za szyję i dusił.' }))).toBe(3);
    expect(level(entry({ description: 'Powiedział, że mnie zabije.' }))).toBe(3);
    expect(level(entry({ description: 'Wyciągnął nóż' }))).toBe(3);
    expect(level(entry({ forms: ['psychiczna'] }), { profile: { relation: '', firearm: 'tak' } })).toBe(3);
  });

  it('does not raise a false alarm on harmless words', () => {
    expect(level(entry({ forms: ['psychiczna'], description: 'Próbowałam się bronić słowami. Dzieci miały zimne nóżki.' }))).toBe(1);
  });

  it('never calls recognised violence fine: economic control is at least level 1', () => {
    const s = assessSeverity({ entry: entry({ description: 'Zabrał mi kartę.' }), history: [] });
    expect(s?.level).toBe(1);
    expect(s?.title).toBe('To nie jest normalne');
  });

  it('physical violence, injuries or repetition make it serious', () => {
    expect(level(entry({ forms: ['fizyczna'] }))).toBe(2);
    expect(level(entry({ forms: ['ekonomiczna'] }), { history: [entry({ forms: ['ekonomiczna'] }), entry({ forms: ['ekonomiczna'] })] })).toBe(2);
  });

  it('says nothing about an unrelated note', () => {
    expect(level(entry({ description: 'Kupiłam chleb.' }))).toBeNull();
  });
});

describe('model assessment with a safety floor', () => {
  const ai = (level: 'zagrozenie' | 'powazne' | 'niepokojace' | 'brak') => ({
    model: 'test',
    level,
    title: 'Model title',
    message: 'Model message',
    markers: ['krzyk'],
    explanation: 'Bo tak napisałaś.',
  });

  it('keeps the model wording when it is at least as strict as the rules', () => {
    const floor = assessSeverity({ entry: entry({ description: 'Zabrał mi kartę.' }), history: [] });
    const a = combineAssessment(ai('powazne'), floor);
    expect(a).toMatchObject({ level: 2, title: 'Model title', raised: false });
  });

  it('never lets the model rate strangling lower than the highest level', () => {
    const floor = assessSeverity({ entry: entry({ description: 'Dusił mnie.' }), history: [] });
    const a = combineAssessment(ai('niepokojace'), floor);
    expect(a?.level).toBe(3);
    expect(a?.raised).toBe(true);
    expect(a?.markers).toContain('duszenie');
    expect(combineAssessment(ai('brak'), floor)?.level).toBe(3);
  });

  it('shows nothing when neither the model nor the rules see harm', () => {
    expect(combineAssessment(ai('brak'), null)).toBeNull();
  });
});
