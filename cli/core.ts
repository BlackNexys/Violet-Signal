import { parseComposition } from '../src/dsl/parser'
import { serializeComposition } from '../src/dsl/serializer'

export type CliExitCode = 0 | 1 | 2

export interface CliDiagnostic {
  code: 'VIOLET_INTERNAL_ERROR' | 'VIOLET_IO_ERROR' | 'VIOLET_NOT_FORMATTED' | 'VIOLET_PARSE_ERROR' | 'VIOLET_USAGE'
  message: string
  file?: string
  line?: number
  excerpt?: string
}

export interface CliIo {
  readFile(path: string): Promise<string>
  writeFile(path: string, contents: string): Promise<void>
  stdout(contents: string): void
  stderr(contents: string): void
}

interface MachineResult {
  ok: boolean
  diagnostics: CliDiagnostic[]
  formatted?: string
}

interface ParsedOptions {
  file: string
  json: boolean
  check: boolean
  write: boolean
}

export const CLI_HELP = `Violet Signal notation tools

Usage:
  violet validate <input.violet> [--json]
  violet format <input.violet> [--check | --write] [--json]
  violet --help
  violet --version

Commands:
  validate  Parse and validate a composition without changing it.
  format    Print canonical notation, check it, or write it in place.
`

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function writeMachineResult(io: CliIo, result: MachineResult): void {
  io.stdout(`${JSON.stringify(result, null, 2)}\n`)
}

function writeHumanDiagnostic(io: CliIo, diagnostic: CliDiagnostic): void {
  const location = diagnostic.file
    ? `${diagnostic.file}${diagnostic.line === undefined ? '' : `:${diagnostic.line}`}`
    : 'violet'
  io.stderr(`${location}: ${diagnostic.code}: ${diagnostic.message}\n`)
  if (diagnostic.excerpt) io.stderr(`  ${diagnostic.excerpt.trim()}\n`)
}

function reportFailure(io: CliIo, diagnostic: CliDiagnostic, json: boolean, exitCode: 1 | 2): CliExitCode {
  if (json) writeMachineResult(io, { ok: false, diagnostics: [diagnostic] })
  else writeHumanDiagnostic(io, diagnostic)
  return exitCode
}

function parseOptions(command: 'validate' | 'format', args: string[]): ParsedOptions | CliDiagnostic {
  let file: string | undefined
  let json = false
  let check = false
  let write = false

  for (const argument of args) {
    if (argument === '--json') json = true
    else if (command === 'format' && argument === '--check') check = true
    else if (command === 'format' && argument === '--write') write = true
    else if (argument.startsWith('-')) {
      return { code: 'VIOLET_USAGE', message: `Unknown option “${argument}”.` }
    } else if (file) {
      return { code: 'VIOLET_USAGE', message: 'Pass exactly one .violet input file.' }
    } else file = argument
  }

  if (!file) return { code: 'VIOLET_USAGE', message: 'Pass one .violet input file.' }
  if (check && write) return { code: 'VIOLET_USAGE', message: 'Choose either --check or --write, not both.' }
  return { file, json, check, write }
}

async function loadCanonicalFile(
  file: string,
  io: CliIo,
): Promise<{ source: string; canonical: string } | CliDiagnostic> {
  let source: string
  try {
    source = await io.readFile(file)
  } catch (error) {
    return {
      code: 'VIOLET_IO_ERROR',
      message: `Could not read the input file: ${errorMessage(error)}`,
      file,
    }
  }

  const parsed = parseComposition(source)
  if (!parsed.ok) {
    return {
      code: 'VIOLET_PARSE_ERROR',
      message: parsed.error.message,
      file,
      line: parsed.error.line,
      excerpt: parsed.error.excerpt,
    }
  }

  return { source, canonical: `${serializeComposition(parsed.composition)}\n` }
}

function isDiagnostic(value: { source: string; canonical: string } | CliDiagnostic): value is CliDiagnostic {
  return 'code' in value
}

async function validate(options: ParsedOptions, io: CliIo): Promise<CliExitCode> {
  const loaded = await loadCanonicalFile(options.file, io)
  if (isDiagnostic(loaded)) {
    return reportFailure(io, loaded, options.json, loaded.code === 'VIOLET_IO_ERROR' ? 2 : 1)
  }

  if (options.json) writeMachineResult(io, { ok: true, diagnostics: [] })
  else io.stdout(`${options.file}: valid\n`)
  return 0
}

async function format(options: ParsedOptions, io: CliIo): Promise<CliExitCode> {
  const loaded = await loadCanonicalFile(options.file, io)
  if (isDiagnostic(loaded)) {
    return reportFailure(io, loaded, options.json, loaded.code === 'VIOLET_IO_ERROR' ? 2 : 1)
  }

  if (options.check) {
    if (loaded.source !== loaded.canonical) {
      return reportFailure(io, {
        code: 'VIOLET_NOT_FORMATTED',
        message: 'The file does not match canonical Violet notation.',
        file: options.file,
      }, options.json, 1)
    }
    if (options.json) writeMachineResult(io, { ok: true, diagnostics: [] })
    else io.stdout(`${options.file}: formatted\n`)
    return 0
  }

  if (options.write) {
    try {
      await io.writeFile(options.file, loaded.canonical)
    } catch (error) {
      return reportFailure(io, {
        code: 'VIOLET_IO_ERROR',
        message: `Could not write the formatted file: ${errorMessage(error)}`,
        file: options.file,
      }, options.json, 2)
    }
    if (options.json) writeMachineResult(io, { ok: true, diagnostics: [] })
    else io.stdout(`${options.file}: formatted\n`)
    return 0
  }

  if (options.json) writeMachineResult(io, { ok: true, diagnostics: [], formatted: loaded.canonical })
  else io.stdout(loaded.canonical)
  return 0
}

async function executeCli(args: string[], io: CliIo, version: string): Promise<CliExitCode> {
  if (args.length === 0 || args.includes('--help') || args[0] === 'help') {
    io.stdout(CLI_HELP)
    return 0
  }
  if (args[0] === '--version' || args[0] === '-v') {
    io.stdout(`${version}\n`)
    return 0
  }

  const command = args[0]
  if (command !== 'validate' && command !== 'format') {
    return reportFailure(io, {
      code: 'VIOLET_USAGE',
      message: `Unknown command “${command}”. Use validate or format.`,
    }, args.includes('--json'), 2)
  }

  const options = parseOptions(command, args.slice(1))
  if ('code' in options) return reportFailure(io, options, args.includes('--json'), 2)
  return command === 'validate' ? validate(options, io) : format(options, io)
}

export async function runCli(args: string[], io: CliIo, version: string): Promise<CliExitCode> {
  try {
    return await executeCli(args, io, version)
  } catch (error) {
    return reportFailure(io, {
      code: 'VIOLET_INTERNAL_ERROR',
      message: `The command failed unexpectedly: ${errorMessage(error)}`,
    }, args.includes('--json'), 2)
  }
}
