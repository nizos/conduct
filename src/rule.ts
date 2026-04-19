export type Action = { type: 'write'; path: string }

export type RuleResult =
  | { kind: 'pass' }
  | { kind: 'violation'; reason: string }

export type Rule = (action: Action) => RuleResult

export type RuleDefinition<O> = (input: {
  action: Action
  options: O
}) => RuleResult
