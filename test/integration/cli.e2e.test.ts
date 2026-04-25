import { spawn } from 'node:child_process'
import { mkdtemp, readFileSync, symlinkSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { describe, it, expect, onTestFinished } from 'vitest'

describe('conduct cli (integration)', () => {
  it('blocks a write that violates the dogfood config', async () => {
    const payload = readFileSync(
      'test/fixtures/claude-code/write-new-file.json',
      'utf8',
    )

    const { stdout, stderr } = await runCli(payload)
    if (!stdout) throw new Error(`cli produced no stdout. stderr: ${stderr}`)
    const response = JSON.parse(stdout)

    expect(response.hookSpecificOutput.permissionDecision).toBe('deny')
  })

  it('allows a Bash payload (no current dogfood rule applies)', async () => {
    // Bash actions are short-circuit-allowed by every current dogfood rule
    // (all are write-only). This makes the test deterministic without
    // having to satisfy the AI-validated enforceTdd rule end-to-end.
    const payload = readFileSync(
      'test/fixtures/claude-code/bash-npm-install.json',
      'utf8',
    )

    const { stdout } = await runCli(payload)
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

function runCli(stdin: string): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ['dist/bin.js', '--agent', 'claude-code'],
      { cwd: path.resolve(), stdio: ['pipe', 'pipe', 'pipe'] },
    )
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk: Buffer) => (stdout += chunk.toString()))
    child.stderr.on('data', (chunk: Buffer) => (stderr += chunk.toString()))
    child.on('close', () => resolve({ stdout, stderr }))
    child.on('error', reject)
    child.stdin.end(stdin)
  })
}
