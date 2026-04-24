export function stringOrRegexMatches(
  haystack: string,
  needle: string | RegExp,
): boolean {
  if (typeof needle === 'string') return haystack.includes(needle)
  return haystack.search(needle) !== -1
}
