export type Action =
  | { type: 'write'; path: string }
  | { type: 'command'; command: string }

export type RuleResult =
  | { kind: 'pass' }
  | { kind: 'violation'; reason: string }

export type Rule = (action: Action) => RuleResult

export type RuleDefinition<Options> = (input: {
  action: Action
  options: Options
}) => RuleResult
