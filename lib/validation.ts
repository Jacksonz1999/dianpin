/**
 * Guards against obvious placeholder/demo text leaking into real employer
 * submissions (store names, job titles/descriptions) — the kind of thing
 * that made it into production once already (see PR that added is_seed).
 * Not a profanity filter, just catches the literal "Example"/"测试"/"test"
 * tokens that placeholder copy tends to leave behind.
 */
const PLACEHOLDER_PATTERNS: RegExp[] = [/example/i, /示例/, /测试/, /\btest\b/i];

export class PlaceholderValueError extends Error {
  constructor(
    public readonly field: string,
    value: string
  ) {
    super(`Field "${field}" looks like placeholder/test content: "${value}"`);
    this.name = "PlaceholderValueError";
  }
}

export function assertNotPlaceholder(field: string, value: string): void {
  if (PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value))) {
    throw new PlaceholderValueError(field, value);
  }
}
