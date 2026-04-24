export function stringOrRegexMatches(
  haystack: string,
  needle: string | RegExp,
): boolean {
  if (typeof needle === 'string') return haystack.includes(needle)
  // Use .search() rather than .test() because .test() on a /.../g regex
  // mutates .lastIndex between invocations and would silently miss matches.
  return haystack.search(needle) !== -1
}
