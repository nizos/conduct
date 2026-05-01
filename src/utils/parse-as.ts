/**
 * `JSON.parse` typed at the call site. Tests that assert on parsed
 * adapter responses or fixtures know the shape the JSON should have;
 * a `parseAs<Shape>(text)` reads cleaner than
 * `JSON.parse(text) as Shape` and keeps the no-unsafe-* lints honest.
 * Caller-asserted, not validated — use Zod at trust boundaries.
 */
export function parseAs<T>(text: string): T {
  return JSON.parse(text) as T
}
