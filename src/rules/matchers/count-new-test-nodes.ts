import { parse, type Lang } from '@ast-grep/napi'

type LanguageHandle = {
  parser: Lang
  patterns: readonly string[]
}

export function countNewTestNodes(
  before: string,
  after: string,
  language: LanguageHandle,
): number {
  return countMatches(after, language) - countMatches(before, language)
}

function countMatches(content: string, language: LanguageHandle): number {
  const root = parse(language.parser, content).root()
  let count = 0
  for (const pattern of language.patterns) {
    count += root.findAll(pattern).length
  }
  return count
}
