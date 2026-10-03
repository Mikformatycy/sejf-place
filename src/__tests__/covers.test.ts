import { ageAtNextBirthday, daysUntilBirthday, daysUntilWatering, isValidDate } from '@/covers/calendar';
import { canonicalize, checkStrength, normalizeNumber, normalizeText } from '@/covers/canonical';
import { COVERS } from '@/covers/catalog';
import { StepRecorder, classifyPress, joinRhythm } from '@/covers/sequence';

describe('canonical key', () => {
  it('normalizes Polish text', () => {
    expect(normalizeText('  Mąka   ŻYTNIA  łódzka ')).toBe('maka zytnia lodzka');
  });

  it('normalizes numbers', () => {
    expect(normalizeNumber('1 250,00')).toBe('1250');
    expect(normalizeNumber('0750')).toBe('750');
    expect(normalizeNumber('2,50')).toBe('2.5');
  });

  it('includes the target, so the same value elsewhere is a different key', () => {
    const a = canonicalize('przepisy', 'number', { action: 'editIngredient', target: 'sernik/0', value: '1250' });
    const b = canonicalize('przepisy', 'number', { action: 'editIngredient', target: 'szarlotka/0', value: '1250' });
    expect(a).toBe('przepisy|editIngredient|sernik/0|1250');
    expect(a).not.toBe(b);
  });

  it('treats differently typed but equal phrases as the same key', () => {
    const a = canonicalize('przepisy', 'text', { action: 'search', value: 'Ciasto Babci Zosi' });
    const b = canonicalize('przepisy', 'text', { action: 'search', value: 'ciasto  babci zosi ' });
    expect(a).toBe(b);
  });

  it('enforces minimum strength', () => {
    expect(checkStrength('text', 'kot').ok).toBe(false);
    expect(checkStrength('text', 'ciasto babci').ok).toBe(true);
    expect(checkStrength('number', '123').ok).toBe(false);
    expect(checkStrength('keys', '19+84').ok).toBe(true);
    expect(checkStrength('sequence', 'a>b>c>d').ok).toBe(false);
    expect(checkStrength('sequence', 'a>b>c>d>e').ok).toBe(true);
    expect(checkStrength('rhythm', 'KKDKD').ok).toBe(false);
    expect(checkStrength('rhythm', 'KKDKDD').ok).toBe(true);
    // Fixed length: longer sequences and rhythms are not accepted either.
    expect(checkStrength('sequence', 'a>b>c>d>e>f').ok).toBe(false);
    expect(checkStrength('rhythm', 'KKDKDDK').ok).toBe(false);
  });

  it('every cover offers at least two key actions', () => {
    expect(COVERS).toHaveLength(6);
    for (const c of COVERS) expect(c.actions.length).toBeGreaterThanOrEqual(2);
  });
});

describe('birthday and plant dates', () => {
  const today = new Date(2026, 9, 3); // 3 October 2026

  it('counts days to the next birthday, wrapping to next year', () => {
    expect(daysUntilBirthday(3, 10, today)).toBe(0);
    expect(daysUntilBirthday(4, 10, today)).toBe(1);
    expect(daysUntilBirthday(15, 10, today)).toBe(12);
    expect(daysUntilBirthday(2, 10, today)).toBe(364);
  });

  it('celebrates 29 February on 28 February outside leap years', () => {
    expect(daysUntilBirthday(29, 2, new Date(2027, 1, 27))).toBe(1);
    expect(daysUntilBirthday(29, 2, new Date(2028, 1, 27))).toBe(2);
  });

  it('gives the age on the next birthday only when the year is known', () => {
    expect(ageAtNextBirthday(15, 10, 1990, today)).toBe(36);
    expect(ageAtNextBirthday(2, 10, 1990, today)).toBe(37);
    expect(ageAtNextBirthday(15, 10, undefined, today)).toBeNull();
  });

  it('rejects dates that do not exist', () => {
    expect(isValidDate(31, 4)).toBe(false);
    expect(isValidDate(29, 2)).toBe(true);
    expect(isValidDate(29, 2, 2023)).toBe(false);
    expect(isValidDate(14, 3, 1987)).toBe(true);
  });

  it('tells when a plant needs water (negative = overdue)', () => {
    expect(daysUntilWatering('2026-10-01', 7, today)).toBe(5);
    expect(daysUntilWatering('2026-09-26', 7, today)).toBe(0);
    expect(daysUntilWatering('2026-09-24', 7, today)).toBe(-2);
  });
});

describe('sequences and rhythm', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('classifies short and long presses', () => {
    expect(classifyPress(120)).toBe('K');
    expect(classifyPress(700)).toBe('D');
  });

  it('reports the sequence after every step and once more, as final, after a pause', () => {
    const done = jest.fn();
    const rec = new StepRecorder((s, final) => done(joinRhythm(s), final), 1500, () => Date.now());
    for (const s of ['K', 'K', 'D', 'K', 'D', 'D']) rec.push(s);
    expect(done).toHaveBeenLastCalledWith('KKDKDD', false); // instant check is possible
    expect(done).not.toHaveBeenCalledWith(expect.anything(), true);
    jest.advanceTimersByTime(1600);
    expect(done).toHaveBeenLastCalledWith('KKDKDD', true);
  });

  it('with a fixed length, reports exactly that many steps at once and nothing shorter', () => {
    const done = jest.fn();
    const rec = new StepRecorder((s, final) => done(joinRhythm(s), final), 1500, () => Date.now(), 6);
    for (const s of ['K', 'K', 'D']) rec.push(s);
    jest.advanceTimersByTime(5000); // a pause no longer submits a short sequence...
    expect(done).not.toHaveBeenCalled();
    for (const s of ['K', 'K', 'D', 'K', 'D', 'D']) rec.push(s); // ...it just starts over
    expect(done).toHaveBeenCalledTimes(1);
    expect(done).toHaveBeenCalledWith('KKDKDD', true);
  });
});
