import { describe, it, expect } from 'vitest'

import { parseArgs } from './parse-args.js'

describe('parseArgs', () => {
  it('returns kind=version when --version is present', () => {
    expect(parseArgs(['node', 'bin.js', '--version'])).toEqual({
      kind: 'version',
    })
  })

  it('returns kind=help when --help is present', () => {
    expect(parseArgs(['node', 'bin.js', '--help'])).toEqual({ kind: 'help' })
  })

  it('returns kind=error with exit 2 when --agent is missing', () => {
    const result = parseArgs(['node', 'bin.js'])

    expect(result.kind).toBe('error')
    if (result.kind === 'error') {
      expect(result.stderr).toMatch(/--agent/)
      expect(result.stderr).toMatch(/missing/)
      expect(result.exitCode).toBe(2)
    }
  })

  it('returns kind=error and lists known vendors when --agent value is unknown', () => {
    const result = parseArgs(['node', 'bin.js', '--agent', 'bogus'])

    expect(result.kind).toBe('error')
    if (result.kind === 'error') {
      expect(result.stderr).toMatch(/bogus/)
      expect(result.stderr).toMatch(/claude-code/)
      expect(result.exitCode).toBe(2)
    }
  })

  it('returns kind=run with the vendor when --agent is valid', () => {
    expect(parseArgs(['node', 'bin.js', '--agent', 'claude-code'])).toEqual({
      kind: 'run',
      vendor: 'claude-code',
      configPath: undefined,
    })
  })

  it('errors when --config is followed by another flag instead of a path', () => {
    const result = parseArgs([
      'node',
      'bin.js',
      '--config',
      '--agent',
      'claude-code',
    ])

    expect(result.kind).toBe('error')
    if (result.kind === 'error') {
      expect(result.stderr).toMatch(/--config/)
      expect(result.stderr).toMatch(/path|missing/i)
      expect(result.exitCode).toBe(2)
    }
  })

  it('captures --config <path> in the run result', () => {
    expect(
      parseArgs([
        'node',
        'bin.js',
        '--agent',
        'claude-code',
        '--config',
        'foo.config.ts',
      ]),
    ).toEqual({
      kind: 'run',
      vendor: 'claude-code',
      configPath: 'foo.config.ts',
    })
  })

  it('captures --debug <path> in the run result so request/response can be logged for diagnostics', () => {
    expect(
      parseArgs([
        'node',
        'bin.js',
        '--agent',
        'claude-code',
        '--debug',
        '/tmp/probity-debug.log',
      ]),
    ).toEqual({
      kind: 'run',
      vendor: 'claude-code',
      configPath: undefined,
      debugLogPath: '/tmp/probity-debug.log',
    })
  })
})
