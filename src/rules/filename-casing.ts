import type { Action, RuleResult } from '../rule.js'

export type Style = 'kebab-case' | 'camelCase' | 'snake_case'

export function filenameCasing(input: {
  action: Action
  options: { style: Style }
}): RuleResult {
  const { path } = input.action
  const { style } = input.options
  if (detectors[style](path)) {
    return { kind: 'violation', reason: `${path} does not match ${style}` }
  }
  return pass
}

const pass: RuleResult = { kind: 'pass' }

const violatesKebab = (path: string): boolean => /[A-Z_]/.test(path)
const violatesCamel = (path: string): boolean =>
  path.includes('-') || /\/[A-Z]/.test(path)
const violatesSnake = (path: string): boolean => /[A-Z]/.test(path)

const detectors = {
  'kebab-case': violatesKebab,
  camelCase: violatesCamel,
  snake_case: violatesSnake,
} satisfies Record<Style, (path: string) => boolean>
