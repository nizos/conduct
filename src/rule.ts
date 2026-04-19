export type Action = { type: 'write'; path: string }

export type RuleResult =
  | { kind: 'pass' }
  | { kind: 'violation'; reason: string }
