import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { copyFile, mkdir, mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const executable = fileURLToPath(new URL('../dist-cli/violet.js', import.meta.url))
const validFixture = fileURLToPath(new URL('../cli/fixtures/valid.violet', import.meta.url))
const invalidFixture = fileURLToPath(new URL('../cli/fixtures/invalid.violet', import.meta.url))

function run(...args) {
  return spawnSync(process.execPath, [executable, ...args], {
    cwd: root,
    encoding: 'utf8',
  })
}

const valid = run('validate', validFixture, '--json')
assert.equal(valid.status, 0, valid.stderr)
assert.deepEqual(JSON.parse(valid.stdout), { ok: true, diagnostics: [] })

const invalid = run('validate', invalidFixture, '--json')
assert.equal(invalid.status, 1, invalid.stderr)
assert.equal(JSON.parse(invalid.stdout).diagnostics[0].code, 'VIOLET_PARSE_ERROR')

const original = await readFile(validFixture, 'utf8')
const check = run('format', validFixture, '--check')
assert.equal(check.status, 1, check.stderr)
assert.match(check.stderr, /VIOLET_NOT_FORMATTED/)
assert.equal(await readFile(validFixture, 'utf8'), original)

const version = run('--version')
assert.equal(version.status, 0, version.stderr)
assert.match(version.stdout, /^\d+\.\d+\.\d+\n$/)

const renderDirectory = await mkdtemp(join(tmpdir(), 'violet-cli-'))
try {
  const output = join(renderDirectory, 'signal.wav')
  const rendered = run('render', validFixture, '--out', output, '--json')
  assert.equal(rendered.status, 0, rendered.stderr)
  assert.deepEqual(JSON.parse(rendered.stdout), { ok: true, diagnostics: [], output })
  const wav = await readFile(output)
  assert.equal(wav.subarray(0, 4).toString('ascii'), 'RIFF')
  assert.equal(wav.subarray(8, 12).toString('ascii'), 'WAVE')
  assert.ok(wav.length > 44, 'rendered WAV contains no audio frames')

  const demo = join(root, 'public/examples/still-burning.violet')
  const loopOutput = join(renderDirectory, 'still-burning-loop.wav')
  const loop = run('render', demo, '--out', loopOutput, '--loop', '1:4', '--json')
  assert.equal(loop.status, 0, loop.stderr || loop.stdout)
  const loopWav = await readFile(loopOutput)
  const frames = Math.round(4 * 32 * 60 / 150 / 4 * 44100)
  assert.equal(loopWav.readUInt16LE(22), 2)
  assert.equal(loopWav.readUInt32LE(24), 44100)
  assert.equal(loopWav.length, 44 + frames * 4, 'loop must have exact musical length without a trailing tail')
  let peak = 0
  let energy = 0
  for (let offset = 44; offset < loopWav.length; offset += 2) {
    const value = loopWav.readInt16LE(offset) / 32768
    peak = Math.max(peak, Math.abs(value))
    energy += value * value
  }
  assert.ok(peak > 0.885 && peak < 0.895, `loop peak ${peak} differs from -1 dBFS`)
  assert.ok(Math.sqrt(energy / (frames * 2)) > 0.015, 'loop is effectively silent')
  for (let channel = 0; channel < 2; channel++) {
    const first = loopWav.readInt16LE(44 + channel * 2) / 32768
    const last = loopWav.readInt16LE(44 + (frames - 1) * 4 + channel * 2) / 32768
    assert.ok(Math.abs(first - last) < 0.08, `loop seam jumps by ${Math.abs(first - last)}`)
  }
  await mkdir(join(root, 'artifacts'), { recursive: true })
  await copyFile(loopOutput, join(root, 'artifacts/still-burning-loop.wav'))
  const invalidLoop = run('render', demo, '--out', loopOutput, '--loop', '1:5', '--json')
  assert.equal(invalidLoop.status, 2)
  assert.match(JSON.parse(invalidLoop.stdout).diagnostics[0].message, /boundaries/)
} finally {
  const resolvedTempRoot = resolve(tmpdir())
  const resolvedRenderDirectory = resolve(renderDirectory)
  assert.ok(resolvedRenderDirectory.startsWith(`${resolvedTempRoot}${sep}`), 'refusing to clean outside the temporary directory')
  await rm(resolvedRenderDirectory, { recursive: true })
}

console.log('CLI smoke test passed.')
