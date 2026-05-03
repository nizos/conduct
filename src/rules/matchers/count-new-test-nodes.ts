import { parse, type Lang, type NapiConfig } from '@ast-grep/napi'

type LanguageId = Lang | (string & {})

type LanguageHandle = {
  parser: LanguageId
  patterns: readonly (string | NapiConfig)[]
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
