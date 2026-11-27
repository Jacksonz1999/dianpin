/**
 * Guards against obvious placeholder/demo text leaking into real employer
 * submissions (store names, job titles/descriptions) — the kind of thing
 * that made it into production once already (see PR that added is_seed).
 * Not a profanity filter, just catches the literal "Example"/"测试"/"test"
 * tokens that placeholder copy tends to leave behind.
 */
const PLACEHOLDER_PATTERNS: RegExp[] = [
  /example/i,
  /示例/,
  /测试/,
  /\btest(?:ing)?\b/i,
  /\bdemo\b/i,
  /^\s*prueba\b/i,
  // "百元店1" style throwaway names from a quick manual test.
  /^百元店\s*\d+\s*$/,
];

export class PlaceholderValueError extends Error {
  constructor(
    public readonly field: string,
    value: string
  ) {
    super(`Field "${field}" looks like placeholder/test content: "${value}"`);
    this.name = "PlaceholderValueError";
  }
}

export class MissingLocalizedContentError extends Error {
  constructor(public readonly field: string) {
    super(`Field "${field}" needs Chinese or Spanish content`);
    this.name = "MissingLocalizedContentError";
  }
}

export class InvalidJobExpiryError extends Error {
  constructor() {
    super("Job expiry must be a valid future date when publishing");
    this.name = "InvalidJobExpiryError";
  }
}

export function normalizeJobExpiry(value: string | null): string | null {
  if (!value) return null;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) throw new InvalidJobExpiryError();
  return new Date(timestamp).toISOString();
}

/**
 * Keeps NOT NULL bilingual columns honest without inventing a translation.
 * If one language is absent, the other language's source text is the fallback.
 */
export function bilingualWithSourceFallback(
  zh: string,
  es: string,
  field: string
): { zh: string; es: string } {
  const zhValue = zh.trim();
  const esValue = es.trim();
  if (!zhValue && !esValue) throw new MissingLocalizedContentError(field);
  return { zh: zhValue || esValue, es: esValue || zhValue };
}

export function assertNotPlaceholder(field: string, value: string): void {
  if (PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value))) {
    throw new PlaceholderValueError(field, value);
  }
}
