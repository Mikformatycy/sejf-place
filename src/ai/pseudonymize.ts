     /**
 * Replaces names the user listed (in every form she typed: "Marek, Marka, Markiem")
 * with placeholders before anything leaves the phone, and restores them afterwards.
 * Polish declension is not guessed: only the exact forms listed are replaced.
 */
export interface Pseudonymizer {
  hide(text: string): string;
  restore(text: string): string;
  placeholders: Map<string, string>;
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** "Marek Nowak, Marka, Markiem; Ewa" -> groups split by ";" (one person per group). */
export function parseNames(raw: string): string[][] {
  return raw
    .split(/[;\n]/)
    .map((group) =>
      group
        .split(',')
        .map((n) => n.trim())
        .filter((n) => n.length >= 2),
    )
    .filter((g) => g.length > 0);
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function makePseudonymizer(raw: string): Pseudonymizer {
  const groups = parseNames(raw);
  const placeholders = new Map<string, string>(); // placeholder -> first (base) form
  const rules: { re: RegExp; placeholder: string }[] = [];
  groups.forEach((forms, i) => {
    const placeholder = `[osoba ${LETTERS[i] ?? i + 1}]`;
    placeholders.set(placeholder, forms[0]);
    // Longest forms first so "Marek Nowak" wins over "Marek".
    for (const form of [...forms].sort((a, b) => b.length - a.length)) {
      rules.push({ re: new RegExp(`(?<![\\p{L}\\p{N}])${escapeRe(form)}(?![\\p{L}\\p{N}])`, 'giu'), placeholder });
    }
  });
  rules.sort((a, b) => b.re.source.length - a.re.source.length);

  return {
    placeholders,
    hide: (text) => rules.reduce((t, r) => t.replace(r.re, r.placeholder), text),
    restore: (text) => {
      let out = text;
      for (const [ph, name] of placeholders) out = out.split(ph).join(name);
      return out;
    },
  };
}
