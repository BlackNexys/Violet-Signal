import { describe, expect, it } from 'vitest'
import { makeEmptyComposition } from '../src/model/composition'
import { serializeComposition } from '../src/dsl/serializer'
import { runCli, type CliIo } from './core'

function harness(initialFiles: Record<string, string> = {}) {
  const files = new Map(Object.entries(initialFiles))
  let stdout = ''
  let stderr = ''
  const renders: Array<{ source: string; outputPath: string }> = []
  const io: CliIo = {
    readFile: async (path) => {
      const contents = files.get(path)
      if (contents === undefined) throw new Error('ENOENT')
      return contents
    },
    writeFile: async (path, contents) => { files.set(path, contents) },
    renderFile: async (source, outputPath) => { renders.push({ source, outputPath }) },
    stdout: (contents) => { stdout += contents },
    stderr: (contents) => { stderr += contents },
  }
  return {
    io,
    files,
    renders,
    stdout: () => stdout,
    stderr: () => stderr,
  }
}

const canonical = `${serializeComposition(makeEmptyComposition())}\n`

describe('Violet CLI', () => {
  it('validates canonical notation', async () => {
    const test = harness({ 'signal.violet': canonical })

    const exitCode = await runCli(['validate', 'signal.violet'], test.io, '0.1.0')

    expect(exitCode).toBe(0)
    expect(test.stdout()).toBe('signal.violet: valid\n')
    expect(test.stderr()).toBe('')
  })

  it('returns stable JSON parse diagnostics and exit code 1', async () => {
    const test = harness({ 'broken.violet': 'scene "Broken" {\n  tempo: 999\n}' })

    const exitCode = await runCli(['validate', 'broken.violet', '--json'], test.io, '0.1.0')
    const result = JSON.parse(test.stdout()) as {
      ok: boolean
      diagnostics: Array<{ code: string; file: string; line: number; excerpt: string }>
    }

    expect(exitCode).toBe(1)
    expect(result.ok).toBe(false)
    expect(result.diagnostics).toEqual([expect.objectContaining({
      code: 'VIOLET_PARSE_ERROR',
      file: 'broken.violet',
      line: 2,
      excerpt: '  tempo: 999',
    })])
    expect(test.stderr()).toBe('')
  })

  it('prints canonical notation without changing the file', async () => {
    const nonCanonical = canonical.replace(/\n/g, '\r\n')
    const test = harness({ 'signal.violet': nonCanonical })

    const exitCode = await runCli(['format', 'signal.violet'], test.io, '0.1.0')

    expect(exitCode).toBe(0)
    expect(test.stdout()).toBe(canonical)
    expect(test.files.get('signal.violet')).toBe(nonCanonical)
  })

  it('checks canonical formatting without writing', async () => {
    const test = harness({ 'signal.violet': canonical.replace(/\n/g, '\r\n') })

    const exitCode = await runCli(['format', 'signal.violet', '--check'], test.io, '0.1.0')

    expect(exitCode).toBe(1)
    expect(test.stderr()).toContain('VIOLET_NOT_FORMATTED')
    expect(test.files.get('signal.violet')).toContain('\r\n')
  })

  it('accepts formatter output as canonical input', async () => {
    const test = harness({ 'signal.violet': canonical })

    const exitCode = await runCli(['format', 'signal.violet', '--check'], test.io, '0.1.0')

    expect(exitCode).toBe(0)
    expect(test.stdout()).toBe('signal.violet: formatted\n')
  })

  it('writes canonical formatting in place', async () => {
    const test = harness({ 'signal.violet': canonical.replace(/\n/g, '\r\n') })

    const exitCode = await runCli(['format', 'signal.violet', '--write'], test.io, '0.1.0')

    expect(exitCode).toBe(0)
    expect(test.files.get('signal.violet')).toBe(canonical)
    expect(test.stdout()).toBe('signal.violet: formatted\n')
  })

  it('uses exit code 2 for usage and file errors', async () => {
    const usage = harness()
    const missing = harness()

    expect(await runCli(['format', 'one.violet', '--check', '--write'], usage.io, '0.1.0')).toBe(2)
    expect(usage.stderr()).toContain('VIOLET_USAGE')
    expect(await runCli(['validate', 'missing.violet'], missing.io, '0.1.0')).toBe(2)
    expect(missing.stderr()).toContain('VIOLET_IO_ERROR')
  })

  it('renders validated canonical notation to the requested output', async () => {
    const test = harness({ 'signal.violet': canonical.replace(/\n/g, '\r\n') })

    const exitCode = await runCli(['render', 'signal.violet', '--out', 'signal.wav', '--json'], test.io, '0.1.0')

    expect(exitCode).toBe(0)
    expect(test.renders).toEqual([{ source: canonical, outputPath: 'signal.wav' }])
    expect(JSON.parse(test.stdout())).toEqual({ ok: true, diagnostics: [], output: 'signal.wav' })
  })

  it('does not initialize rendering for invalid notation', async () => {
    const test = harness({ 'broken.violet': 'not violet' })

    const exitCode = await runCli(['render', 'broken.violet', '--out', 'broken.wav'], test.io, '0.1.0')

    expect(exitCode).toBe(1)
    expect(test.renders).toHaveLength(0)
    expect(test.stderr()).toContain('VIOLET_PARSE_ERROR')
  })

  it('reports render failures and missing output paths with stable diagnostics', async () => {
    const failed = harness({ 'signal.violet': canonical })
    failed.io.renderFile = async () => { throw new Error('Chrome unavailable') }
    const usage = harness({ 'signal.violet': canonical })

    expect(await runCli(['render', 'signal.violet', '--out', 'signal.wav', '--json'], failed.io, '0.1.0')).toBe(2)
    expect(JSON.parse(failed.stdout()).diagnostics[0].code).toBe('VIOLET_RENDER_ERROR')
    expect(await runCli(['render', 'signal.violet'], usage.io, '0.1.0')).toBe(2)
    expect(usage.stderr()).toContain('VIOLET_USAGE')
  })

  it('maps unexpected failures to a stable internal diagnostic', async () => {
    const test = harness({ 'signal.violet': canonical })
    test.io.readFile = async () => null as unknown as string

    const exitCode = await runCli(['validate', 'signal.violet', '--json'], test.io, '0.1.0')
    const result = JSON.parse(test.stdout()) as { diagnostics: Array<{ code: string }> }

    expect(exitCode).toBe(2)
    expect(result.diagnostics[0].code).toBe('VIOLET_INTERNAL_ERROR')
  })

  it('reports the packaged version', async () => {
    const test = harness()

    const exitCode = await runCli(['--version'], test.io, '0.1.0')

    expect(exitCode).toBe(0)
    expect(test.stdout()).toBe('0.1.0\n')
  })
})
