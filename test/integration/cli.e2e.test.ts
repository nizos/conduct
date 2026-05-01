import { spawn } from 'node:child_process'
import { mkdtemp, readFileSync, symlinkSync } from 'node:fs'
import { rm } from 'node:fs/promises'
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

  // Vendor payloads carry absolute paths; each adapter must relativize
  // against the payload cwd before the matcher so non-anchored globs
  // like `files: ['src/**']` reach the rule.
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
    'relativizes absolute paths so files: ["src/**"] reaches the rule on $vendor',
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
    const dir = await new Promise<string>((resolve, reject) => {
      mkdtemp(path.join(tmpdir(), 'conduct-bin-link-'), (err, d) =>
        err ? reject(err) : resolve(d),
      )
    })
    onTestFinished(async () => {
      await rm(dir, { recursive: true, force: true })
    })
    const link = path.join(dir, 'conduct')
    symlinkSync(path.resolve('dist/bin.js'), link)

    const { stdout } = await runCliAt(link, ['--version'], '')

    expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+/)
  })
})

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
