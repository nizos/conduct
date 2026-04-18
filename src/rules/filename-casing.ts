export type FilenameCasingInput = {
  action: { path: string }
  options: { style: Style }
}

export function filenameCasing(input: FilenameCasingInput): Result {
  return detectors[input.options.style](input.action.path) ? violation : pass
}

type Style = 'kebab-case' | 'camelCase' | 'snake_case'

type Result = { kind: 'pass' } | { kind: 'violation' }

const pass: Result = { kind: 'pass' }
const violation: Result = { kind: 'violation' }

const violatesKebab = (path: string): boolean => /[A-Z_]/.test(path)
const violatesCamel = (path: string): boolean =>
  path.includes('-') || /\/[A-Z]/.test(path)
const violatesSnake = (path: string): boolean => /[A-Z]/.test(path)

const detectors = {
  'kebab-case': violatesKebab,
  camelCase: violatesCamel,
  snake_case: violatesSnake,
} satisfies Record<Style, (path: string) => boolean>
