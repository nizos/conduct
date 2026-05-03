import path from 'node:path'

import { z } from 'zod'

import type { RawSessionEvent } from '../../types.js'
import { readJsonl } from '../../utils/read-jsonl.js'

/**
 * Derives the parallel chatSessions path from a Copilot Chat
 * transcript path. Detects POSIX or Windows separators from the input
 * string rather than `path.sep` (which reflects the runtime, not the
 * path style). Returns the input unchanged if the expected segments
 * aren't found.
 */
export function deriveChatSessionsPath(transcriptPath: string): string {
  const sep = transcriptPath.includes(path.win32.sep)
    ? path.win32.sep
    : path.posix.sep
  return transcriptPath.replace(
    `${sep}GitHub.copilot-chat${sep}transcripts${sep}`,
    `${sep}chatSessions${sep}`,
  )
}

/**
 * Delta-stream opcodes from VS Code's `ObjectMutationLog` — the
 * primitive the chat session writer uses to journal a session as a
 * single Initial snapshot followed by Set / Push mutations against
 * paths in that snapshot. Upstream also defines `Delete = 3`, which we
 * have not yet seen in real fixtures and don't currently handle.
 *
 * Names mirror upstream:
 * https://github.com/microsoft/vscode/blob/main/src/vs/workbench/contrib/chat/common/model/objectMutationLog.ts
 */
const EntryKind = {
  Initial: 0,
  Set: 1,
  Push: 2,
} as const

/**
 * Node kinds in the `@vscode/prompt-tsx` JSON tree. Tools that render
 * structured content embed a `Piece` tree whose `Text` leaves carry
 * the user-visible string. Names mirror upstream:
 * https://github.com/microsoft/vscode-prompt-tsx/blob/main/src/base/jsonTypes.ts
 */
const PromptNodeType = {
  Piece: 1,
  Text: 2,
  Opaque: 3,
} as const

/**
 * Suffix the chat-sessions writer appends to tool call ids
 * (`call_aaa111__vscode-1777358467268`). Undocumented; we strip it to
 * match the bare id surfaced by `tool.execution_start` events on the
 * transcript side.
 */
const VSCODE_TOOL_ID_SUFFIX = '__vscode-'

const UserMessageSchema = z.object({
  type: z.literal('user.message'),
  data: z.object({ content: z.string() }),
})

const ToolStartSchema = z.object({
  type: z.literal('tool.execution_start'),
  data: z.object({
    toolCallId: z.string(),
    toolName: z.string(),
    arguments: z.unknown(),
  }),
})

const PathSegmentSchema = z.union([z.string(), z.number()])

const DeltaSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal(EntryKind.Initial), v: z.unknown() }),
  z.object({
    kind: z.literal(EntryKind.Set),
    k: z.array(PathSegmentSchema),
    v: z.unknown(),
  }),
  z.object({
    kind: z.literal(EntryKind.Push),
    k: z.array(PathSegmentSchema),
    v: z.unknown(),
  }),
])

type State = Record<string, unknown>
type PathSegments = ReadonlyArray<string | number>
type Indexable = Record<string | number, unknown>
type ActionEvent = Extract<RawSessionEvent, { kind: 'action' }>

/**
 * Reads a Copilot Chat (VS Code extension) transcript and joins it
 * with the parallel chatSessions file to surface a canonical session
 * timeline. Chat splits a session across two JSONL files: the
 * transcript carries `user.message` and `tool.execution_start` events,
 * the chatSessions file carries tool outputs as a delta stream which
 * we replay into a state object before walking
 * `requests[*].result.metadata.toolCallResults` for outputs.
 */
export async function readTranscript(
  transcriptPath: string,
  options: { maxBytes?: number; chatSessionsPath?: string } = {},
): Promise<RawSessionEvent[]> {
  const events: RawSessionEvent[] = []
  const actions = new Map<string, ActionEvent>()
  const entries = await readJsonl(transcriptPath, options)
  for (const entry of entries) {
    const event = parseTimelineEntry(entry)
    if (!event) continue
    events.push(event)
    if (event.kind === 'action') actions.set(event.toolUseId, event)
  }
  const chatSessionsPath =
    options.chatSessionsPath ?? deriveChatSessionsPath(transcriptPath)
  if (chatSessionsPath !== transcriptPath) {
    const outputs = await readToolOutputs(chatSessionsPath, options)
    for (const [toolUseId, action] of actions) {
      const output = outputs.get(toolUseId)
      if (output !== undefined) action.output = output
    }
  }
  return events
}

function parseTimelineEntry(entry: unknown): RawSessionEvent | undefined {
  const user = UserMessageSchema.safeParse(entry)
  if (user.success) return { kind: 'prompt', text: user.data.data.content }
  const start = ToolStartSchema.safeParse(entry)
  if (!start.success) return undefined
  const { toolCallId, toolName, arguments: input } = start.data.data
  return {
    kind: 'action',
    tool: toolName,
    input,
    output: '',
    toolUseId: toolCallId,
  }
}

async function readToolOutputs(
  chatSessionsPath: string,
  options: { maxBytes?: number },
): Promise<Map<string, string>> {
  const entries = await readChatSessions(chatSessionsPath, options)
  const state = replayDeltas(entries)
  return state ? extractToolOutputs(state) : new Map()
}

/**
 * Reads the chatSessions JSONL, returning [] when the file is absent
 * (a fresh session, or a derived path that doesn't exist). Other
 * errors (size cap, unreadable file) propagate so they're not silently
 * lost.
 */
async function readChatSessions(
  chatSessionsPath: string,
  options: { maxBytes?: number },
): Promise<unknown[]> {
  try {
    return await readJsonl(chatSessionsPath, options)
  } catch (err) {
    if (err instanceof Error && 'code' in err && err.code === 'ENOENT') {
      return []
    }
    throw err
  }
}

/**
 * Replays the delta stream into a single state object. The first
 * Initial entry seeds the state; subsequent Set / Push entries mutate
 * it in place. Returns `undefined` if no Initial entry was seen — in
 * which case there are no tool outputs to extract.
 */
function replayDeltas(entries: unknown[]): State | undefined {
  let state: State | undefined
  for (const entry of entries) {
    const delta = DeltaSchema.safeParse(entry)
    if (!delta.success) continue
    if (delta.data.kind === EntryKind.Initial) {
      if (isPlainObject(delta.data.v)) state = delta.data.v
      continue
    }
    if (!state) continue
    const { k: segments, v: value } = delta.data
    if (delta.data.kind === EntryKind.Set) setAtPath(state, segments, value)
    else appendAtPath(state, segments, value)
  }
  return state
}

/**
 * Walks `state.requests[*].result.metadata.toolCallResults` and
 * returns a `bareToolCallId -> output` map. The chatSessions side
 * suffixes ids with `__vscode-...` which we strip so they match the
 * bare ids on the transcript side.
 */
function extractToolOutputs(state: State): Map<string, string> {
  const outputs = new Map<string, string>()
  const requests = state.requests
  if (!Array.isArray(requests)) return outputs
  for (const request of requests) {
    const results = getAtPath(request, [
      'result',
      'metadata',
      'toolCallResults',
    ])
    if (!isPlainObject(results)) continue
    for (const [fullId, result] of Object.entries(results)) {
      const output = extractPlainString(result)
      if (output !== undefined)
        outputs.set(stripVscodeToolIdSuffix(fullId), output)
    }
  }
  return outputs
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/**
 * Anything we can index with a string or number key — plain objects
 * AND arrays. Used to walk paths through the delta state, where
 * segments like `['requests', 0, 'result']` cross both kinds.
 */
function isIndexable(value: unknown): value is Indexable {
  return value !== null && typeof value === 'object'
}

/**
 * Walks `segments` from `root`, returning the value at the leaf or
 * `undefined` if any step misses a non-object. Treats arrays as
 * indexable by numeric or string keys, mirroring how the delta stream
 * addresses them (`k: ['requests', 0, 'result']`).
 */
function getAtPath(root: unknown, segments: PathSegments): unknown {
  let current: unknown = root
  for (const segment of segments) {
    if (!isIndexable(current)) return undefined
    current = current[segment]
  }
  return current
}

function setAtPath(state: State, segments: PathSegments, value: unknown): void {
  const lastSegment = segments[segments.length - 1]
  if (lastSegment === undefined) return
  const parent = getAtPath(state, segments.slice(0, -1))
  if (!isIndexable(parent)) return
  parent[lastSegment] = value
}

function appendAtPath(
  state: State,
  segments: PathSegments,
  value: unknown,
): void {
  const target = getAtPath(state, segments)
  if (Array.isArray(target) && Array.isArray(value)) {
    target.push(...(value as unknown[]))
  }
}

function stripVscodeToolIdSuffix(fullId: string): string {
  const suffixStart = fullId.indexOf(VSCODE_TOOL_ID_SUFFIX)
  return suffixStart === -1 ? fullId : fullId.slice(0, suffixStart)
}

/**
 * Reads one `toolCallResults` entry's `content` array and concatenates
 * its plain text. Each item is either a `value: string` (simple tools)
 * or a `value: { node }` carrying a `@vscode/prompt-tsx` JSON tree
 * (tools that render structured content).
 */
function extractPlainString(result: unknown): string | undefined {
  if (!isPlainObject(result)) return undefined
  const content = result.content
  if (!Array.isArray(content)) return undefined
  return content.map(extractContentItemText).join('')
}

function extractContentItemText(item: unknown): string {
  if (!isPlainObject(item)) return ''
  const value = item.value
  if (typeof value === 'string') return value
  if (isPlainObject(value) && value.node !== undefined) {
    return walkPromptTsxNode(value.node)
  }
  return ''
}

function walkPromptTsxNode(node: unknown): string {
  if (!isPlainObject(node)) return ''
  if (node.type === PromptNodeType.Text && typeof node.text === 'string') {
    return node.text
  }
  if (Array.isArray(node.children)) {
    return node.children.map(walkPromptTsxNode).join('')
  }
  return ''
}
