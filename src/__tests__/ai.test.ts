import { makePseudonymizer, parseNames } from '@/ai/pseudonymize';
import { checkItems, numbersIn } from '@/ai/validate';

describe('pseudonymize', () => {
  it('replaces every listed form, longest first, and restores names', () => {
    const p = makePseudonymizer('Marek Nowak, Marek, Marka, Markiem; Ewa');
    const hidden = p.hide('Marek Nowak zabrał kartę. Rozmawiałam z Markiem i Ewą? Nie, z Ewa. marka samochodu');
    expect(hidden).toContain('[osoba A] zabrał kartę');
    expect(hidden).toContain('z [osoba A] i');
    expect(hidden).toContain('z [osoba B]');
    expect(hidden).not.toMatch(/Marek|Markiem/);
    // Known limitation, documented in the UI: unlisted forms ("Ewą") stay, and common words equal
    // to a listed form ("marka") are replaced too.
    expect(hidden).toContain('Ewą');
    expect(p.restore('[osoba A] odebrał wypłatę')).toBe('Marek Nowak odebrał wypłatę');
  });

  it('parses one person per ";" or line', () => {
    expect(parseNames('Jan, Jana\nAnna')).toEqual([['Jan', 'Jana'], ['Anna']]);
  });
});

describe('AI output validation', () => {
  const sources = [
    { id: 'e1', date: '2026-09-12T21:30', description: 'Zabrał mi kartę. Na koncie było 1500 zł.' },
    { id: 'e2', date: '2026-09-20T08:00', description: 'Nie dał pieniędzy na leki dla córki.' },
  ];

  it('accepts sentences grounded in the entries', () => {
    const [ok] = checkItems([{ entryIds: ['e1'], text: '12 września 2026 r. o 21:30 zabrał mi kartę; na koncie było 1500 zł.' }], sources);
    expect(ok.flags).toEqual([]);
  });

  it('flags invented amounts and dates', () => {
    const [bad] = checkItems([{ entryIds: ['e1'], text: 'Zabrał kartę i 2000 zł.' }], sources);
    expect(bad.flags.join(' ')).toMatch(/2000/);
    const [badMonth] = checkItems([{ entryIds: ['e2'], text: 'W październiku nie dał pieniędzy na leki.' }], sources);
    expect(badMonth.flags.join(' ')).toMatch(/Miesiąc/);
  });

  it('flags missing or unknown entry references', () => {
    const [none, unknown] = checkItems(
      [
        { entryIds: [], text: 'Coś się stało.' },
        { entryIds: ['e9'], text: 'Coś się stało.' },
      ],
      sources,
    );
    expect(none.flags.length).toBeGreaterThan(0);
    expect(unknown.flags.join(' ')).toMatch(/nie wysłano/);
  });

  it('extracts numbers without leading zeros', () => {
    expect(numbersIn('o 09:05, 1 500 zł')).toEqual(['9', '5', '1', '500']);
  });
});
