import { spawn } from 'node:child_process'
import { readFileSync, symlinkSync } from 'node:fs'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { describe, it, expect, onTestFinished } from 'vitest'

import type { Vendor } from '../../src/cli.js'

const CONFIG_FIXTURE = 'test/fixtures/configs/kebab-only.config.ts'

describe('conduct cli (integration)', () => {
  it('blocks a write that violates the configured rules', async () => {
    const { getResponse } = await setup({
      payloadFixture: 'test/fixtures/claude-code/write-new-file.json',
      config: CONFIG_FIXTURE,
    })

    expect(getResponse().hookSpecificOutput.permissionDecision).toBe('deny')
  })

  it('emits no opinion (empty stdout) for a Bash payload that no rule blocks', async () => {
    const { getRawStdout } = await setup({
      payloadFixture: 'test/fixtures/claude-code/bash-npm-install.json',
      config: CONFIG_FIXTURE,
    })

    expect(getRawStdout()).toBe('')
  })

  it('loads the config from --config <path> instead of discovering one', async () => {
    const { getRawStdout } = await setup({
      payloadFixture: 'test/fixtures/claude-code/write-kebab-case.json',
      config: 'test/fixtures/configs/kebab-only.config.ts',
    })

    expect(getRawStdout()).toBe('')
  })

  it('blocks a write whose path matches a { files, rules } block scope', async () => {
    const { getResponse } = await setup({
      payloadFixture: 'test/fixtures/claude-code/write-new-file.json',
      config: 'test/fixtures/configs/blocks.config.ts',
    })

    expect(getResponse().hookSpecificOutput.permissionDecision).toBe('deny')
  })

  it('skips a { files, rules } block when the write path is outside its files glob', async () => {
    const { getRawStdout } = await setup({
      payloadFixture: 'test/fixtures/claude-code/write-outside-src.json',
      config: 'test/fixtures/configs/blocks.config.ts',
    })

    expect(getRawStdout()).toBe('')
  })

  it.each([
    {
      vendor: 'claude-code' as const,
      fixture: 'test/fixtures/claude-code/write-new-file.json',
      readDeny: (out: string) =>
        JSON.parse(out).hookSpecificOutput.permissionDecision,
      expected: 'deny',
    },
    {
      vendor: 'codex' as const,
      fixture: 'test/fixtures/codex/pre-apply-patch.json',
      readDeny: (out: string) => JSON.parse(out).decision,
      expected: 'block',
    },
    {
      vendor: 'github-copilot' as const,
      fixture: 'test/fixtures/github-copilot/pre-create-new-test.json',
      readDeny: (out: string) => JSON.parse(out).permissionDecision,
      expected: 'deny',
    },
    {
      vendor: 'github-copilot-chat' as const,
      fixture: 'test/fixtures/github-copilot-chat/pre-create-file.json',
      readDeny: (out: string) =>
        JSON.parse(out).hookSpecificOutput.permissionDecision,
      expected: 'deny',
    },
  ])(
    'matches absolute paths from $vendor against `**/src/**` globs',
    async ({ vendor, fixture, readDeny, expected }) => {
      const { getStdout } = await setup({
        vendor,
        payloadFixture: fixture,
        config: 'test/fixtures/configs/relative-glob.config.ts',
      })

      expect(readDeny(getStdout())).toBe(expected)
    },
  )

  it('runs main() when invoked via a symlink (the npx case)', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'conduct-bin-link-'))
    onTestFinished(async () => {
      await rm(dir, { recursive: true, force: true })
    })
    const link = path.join(dir, 'conduct')
    symlinkSync(path.resolve('dist/bin.js'), link)

    const { stdout } = await runCliAt(link, ['--version'], '')

    expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+/)
  })

  it('matches a config rule scoped at the config root when the session opens in a subdirectory', async () => {
    const { configPath, example } = await setupParentConfigProject()
    const filePath = path.join(example, 'src', 'foo.ts')
    const payload = makeClaudeCodeWritePayload({
      cwd: example,
      filePath,
    })

    const { getResponse } = await setup({
      payload,
      config: configPath,
    })

    expect(getResponse().hookSpecificOutput.permissionDecision).toBe('deny')
  })
})

async function setupParentConfigProject(): Promise<{
  projectRoot: string
  configPath: string
  example: string
  deepCwd: string
}> {
  const projectRoot = await mkdtemp(path.join(tmpdir(), 'conduct-e2e-cwd-'))
  onTestFinished(async () => {
    await rm(projectRoot, { recursive: true, force: true })
  })
  const example = path.join(projectRoot, 'example')
  const deepCwd = path.join(example, 'src')
  await mkdir(deepCwd, { recursive: true })

  const distEntry = path.resolve('dist/index.js')
  const configPath = path.join(projectRoot, 'conduct.config.ts')
  await writeFile(
    configPath,
    [
      `import { defineConfig, forbidContentPattern } from '${distEntry}'`,
      `export default defineConfig({`,
      `  rules: [{`,
      `    files: ['example/src/**'],`,
      `    rules: [forbidContentPattern({ match: /./, reason: 'edge-case rule fired' })],`,
      `  }],`,
      `})`,
      ``,
    ].join('\n'),
  )
  return { projectRoot, configPath, example, deepCwd }
}

function makeClaudeCodeWritePayload(opts: {
  cwd: string
  filePath: string
}): string {
  return JSON.stringify({
    session_id: 'edge-case',
    transcript_path: '/tmp/transcript.jsonl',
    cwd: opts.cwd,
    hook_event_name: 'PreToolUse',
    tool_name: 'Write',
    tool_input: { file_path: opts.filePath, content: 'x' },
    tool_use_id: 'tu_edge_case',
  })
}

async function setup(options: {
  payloadFixture?: string
  payload?: string
  config?: string
  vendor?: Vendor
}) {
  const payload =
    options.payload ?? readFileSync(options.payloadFixture!, 'utf8')

  const args = ['--agent', options.vendor ?? 'claude-code']
  if (options.config) args.push('--config', options.config)

  const result = await runCliAt('dist/bin.js', args, payload)

  const getStdout = () =>
    requireStdout(result, 'expected cli to emit a response')

  const getRawStdout = () => result.stdout

  const getResponse = () => JSON.parse(getStdout())

  return { getStdout, getRawStdout, getResponse }
}

function requireStdout(
  result: { stdout: string; stderr: string },
  context: string,
): string {
  if (!result.stdout) {
    throw new Error(`${context}; stdout was empty. stderr: ${result.stderr}`)
  }
  return result.stdout
}

function runCliAt(
  binPath: string,
  args: readonly string[],
  stdin: string,
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [binPath, ...args], {
      cwd: path.resolve(),
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk: Buffer) => (stdout += chunk.toString()))
    child.stderr.on('data', (chunk: Buffer) => (stderr += chunk.toString()))
    child.on('close', () => resolve({ stdout, stderr }))
    child.on('error', reject)
    child.stdin.end(stdin)
  })
}
