import { spawn } from 'node:child_process'
import { readFileSync, symlinkSync } from 'node:fs'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { describe, it, expect, onTestFinished } from 'vitest'

const CONFIG_FIXTURE = 'test/fixtures/configs/kebab-only.config.ts'

describe('conduct cli (integration)', () => {
  it('blocks a write that violates the configured rules', async () => {
    const payload = readFileSync(
      'test/fixtures/claude-code/write-new-file.json',
      'utf8',
    )

    const result = await runCliAt(
      'dist/bin.js',
      ['--agent', 'claude-code', '--config', CONFIG_FIXTURE],
      payload,
    )
    const stdout = requireStdout(result, 'expected cli to emit a response')
    const response = JSON.parse(stdout)

    expect(response.hookSpecificOutput.permissionDecision).toBe('deny')
  })

  it('emits no opinion (empty stdout) for a Bash payload that no rule blocks', async () => {
    const payload = readFileSync(
      'test/fixtures/claude-code/bash-npm-install.json',
      'utf8',
    )

    const { stdout } = await runCliAt(
      'dist/bin.js',
      ['--agent', 'claude-code', '--config', CONFIG_FIXTURE],
      payload,
    )

    expect(stdout).toBe('')
  })

  it('loads the config from --config <path> instead of discovering one', async () => {
    const payload = readFileSync(
      'test/fixtures/claude-code/write-kebab-case.json',
      'utf8',
    )

    const { stdout } = await runCliAt(
      'dist/bin.js',
      [
        '--agent',
        'claude-code',
        '--config',
        'test/fixtures/configs/kebab-only.config.ts',
      ],
      payload,
    )

    expect(stdout).toBe('')
  })

  it('blocks a write whose path matches a { files, rules } block scope', async () => {
    const payload = readFileSync(
      'test/fixtures/claude-code/write-new-file.json',
      'utf8',
    )

    const { stdout } = await runCliAt(
      'dist/bin.js',
      [
        '--agent',
        'claude-code',
        '--config',
        'test/fixtures/configs/blocks.config.ts',
      ],
      payload,
    )
    const response = JSON.parse(stdout)

    expect(response.hookSpecificOutput.permissionDecision).toBe('deny')
  })

  it('skips a { files, rules } block when the write path is outside its files glob', async () => {
    const payload = readFileSync(
      'test/fixtures/claude-code/write-outside-src.json',
      'utf8',
    )

    const { stdout } = await runCliAt(
      'dist/bin.js',
      [
        '--agent',
        'claude-code',
        '--config',
        'test/fixtures/configs/blocks.config.ts',
      ],
      payload,
    )

    expect(stdout).toBe('')
  })

  it.each([
    {
      vendor: 'claude-code',
      fixture: 'test/fixtures/claude-code/write-new-file.json',
      readDeny: (out: string) =>
        JSON.parse(out).hookSpecificOutput.permissionDecision,
      expected: 'deny',
    },
    {
      vendor: 'codex',
      fixture: 'test/fixtures/codex/pre-apply-patch.json',
      readDeny: (out: string) => JSON.parse(out).decision,
      expected: 'block',
    },
    {
      vendor: 'github-copilot',
      fixture: 'test/fixtures/github-copilot/pre-create-new-test.json',
      readDeny: (out: string) => JSON.parse(out).permissionDecision,
      expected: 'deny',
    },
    {
      vendor: 'github-copilot-chat',
      fixture: 'test/fixtures/github-copilot-chat/pre-create-file.json',
      readDeny: (out: string) =>
        JSON.parse(out).hookSpecificOutput.permissionDecision,
      expected: 'deny',
    },
  ])(
    'matches absolute paths from $vendor against `**/src/**` globs',
    async ({ vendor, fixture, readDeny, expected }) => {
      const payload = readFileSync(fixture, 'utf8')

      const result = await runCliAt(
        'dist/bin.js',
        [
          '--agent',
          vendor,
          '--config',
          'test/fixtures/configs/relative-glob.config.ts',
        ],
        payload,
      )
      const stdout = requireStdout(
        result,
        `expected ${vendor} matcher to engage and produce a deny`,
      )

      expect(readDeny(stdout)).toBe(expected)
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

    const result = await runCliAt(
      'dist/bin.js',
      ['--agent', 'claude-code', '--config', configPath],
      payload,
    )
    const stdout = requireStdout(
      result,
      `expected deny with config at ${configPath} and session in ${example}`,
    )

    expect(JSON.parse(stdout).hookSpecificOutput.permissionDecision).toBe(
      'deny',
    )
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
