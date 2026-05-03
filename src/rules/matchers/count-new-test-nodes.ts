import { parse, type Lang, type NapiConfig } from '@ast-grep/napi'

type LanguageId = Lang | (string & {})

type LanguageHandle = {
  parser: LanguageId | undefined
  patterns: readonly (string | NapiConfig)[]
}

export function countNewTestNodes(
  before: string,
  after: string,
  language: LanguageHandle,
): number {
  if (!language.parser) return 0
  return (
    countMatches(after, language.parser, language.patterns) -
    countMatches(before, language.parser, language.patterns)
  )
}

function countMatches(
  content: string,
  parser: LanguageId,
  patterns: readonly (string | NapiConfig)[],
): number {
  const root = parse(parser, content).root()
  let count = 0
  for (const pattern of patterns) {
    count += root.findAll(pattern).length
  }
  return count
}
