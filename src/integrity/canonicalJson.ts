/**
 * Deterministic JSON: object keys sorted by UTF-16 code units, no whitespace,
 * integers only (no floats), `undefined` properties dropped. Equivalent to
 * RFC 8785 (JCS) for the value types we store, so any independent verifier
 * can recompute entry hashes byte-for-byte.
 */
export function canonicalJson(value: unknown): string {
  if (value === null) return 'null';
  switch (typeof value) {
    case 'boolean':
      return value ? 'true' : 'false';
    case 'number':
      if (!Number.isSafeInteger(value)) throw new Error(`Only safe integers allowed, got ${value}`);
      return String(value);
    case 'string':
      return JSON.stringify(value);
    case 'object': {
      if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
      const obj = value as Record<string, unknown>;
      const keys = Object.keys(obj)
        .filter((k) => obj[k] !== undefined)
        .sort();
      return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`).join(',')}}`;
    }
    default:
      throw new Error(`Unsupported type in canonical JSON: ${typeof value}`);
  }
}
