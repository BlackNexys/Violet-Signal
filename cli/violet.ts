#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises'
import packageMetadata from '../package.json' with { type: 'json' }
import { runCli, type CliIo } from './core'

const io: CliIo = {
  readFile: (path) => readFile(path, 'utf8'),
  writeFile: (path, contents) => writeFile(path, contents, 'utf8'),
  renderFile: async (source, outputPath, inputPath) => {
    const { renderCompositionFile } = await import('./render')
    await renderCompositionFile(source, outputPath, inputPath)
  },
  stdout: (contents) => process.stdout.write(contents),
  stderr: (contents) => process.stderr.write(contents),
}

process.exitCode = await runCli(process.argv.slice(2), io, packageMetadata.version)
