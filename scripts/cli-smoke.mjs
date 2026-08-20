import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
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

console.log('CLI smoke test passed.')
