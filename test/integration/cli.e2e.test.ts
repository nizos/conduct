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

    const { stdout, stderr } = await runCliAt(
      'dist/bin.js',
      ['--agent', 'claude-code', '--config', CONFIG_FIXTURE],
      payload,
    )
    if (!stdout) throw new Error(`cli produced no stdout. stderr: ${stderr}`)
    const response = JSON.parse(stdout)

    expect(response.hookSpecificOutput.permissionDecision).toBe('deny')
  })

  it('allows a Bash payload (write-only rules do not apply)', async () => {
    const payload = readFileSync(
      'test/fixtures/claude-code/bash-npm-install.json',
      'utf8',
    )

    const { stdout } = await runCliAt(
      'dist/bin.js',
      ['--agent', 'claude-code', '--config', CONFIG_FIXTURE],
      payload,
    )
    const response = JSON.parse(stdout)

    expect(response.hookSpecificOutput.permissionDecision).toBe('allow')
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
    const response = JSON.parse(stdout)

    expect(response.hookSpecificOutput.permissionDecision).toBe('allow')
  })

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
