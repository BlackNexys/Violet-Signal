import { createServer, type Server } from 'node:http'
import { access, readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, extname, isAbsolute, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, type Browser } from 'playwright-core'

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

async function rendererRoot(): Promise<string> {
  const moduleDirectory = dirname(fileURLToPath(import.meta.url))
  for (const candidate of [moduleDirectory, dirname(moduleDirectory)]) {
    if (await exists(resolve(candidate, 'renderer.html'))) return candidate
  }
  throw new Error('The packaged browser renderer is missing. Reinstall Violet Signal.')
}

function browserCandidates(): string[] {
  const configured = [process.env.VIOLET_CHROME_PATH, process.env.CHROME_PATH]
  if (process.platform === 'win32') {
    const programFiles = process.env.ProgramFiles ?? 'C:\\Program Files'
    const programFilesX86 = process.env['ProgramFiles(x86)'] ?? 'C:\\Program Files (x86)'
    const localAppData = process.env.LOCALAPPDATA
    return [
      ...configured,
      resolve(programFiles, 'Google/Chrome/Application/chrome.exe'),
      resolve(programFilesX86, 'Google/Chrome/Application/chrome.exe'),
      resolve(programFiles, 'Microsoft/Edge/Application/msedge.exe'),
      resolve(programFilesX86, 'Microsoft/Edge/Application/msedge.exe'),
      localAppData && resolve(localAppData, 'Google/Chrome/Application/chrome.exe'),
      localAppData && resolve(localAppData, 'Microsoft/Edge/Application/msedge.exe'),
    ].filter((candidate): candidate is string => Boolean(candidate))
  }
  if (process.platform === 'darwin') {
    return [
      ...configured,
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      resolve(homedir(), 'Applications/Google Chrome.app/Contents/MacOS/Google Chrome'),
    ].filter((candidate): candidate is string => Boolean(candidate))
  }
  return [
    ...configured,
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/microsoft-edge',
    '/usr/bin/microsoft-edge-stable',
  ].filter((candidate): candidate is string => Boolean(candidate))
}

async function findBrowser(): Promise<string> {
  for (const candidate of browserCandidates()) {
    if (await exists(candidate)) return candidate
  }
  throw new Error('Chrome or Edge was not found. Install one or set VIOLET_CHROME_PATH to its executable.')
}

async function startRendererServer(root: string): Promise<{ server: Server; url: string }> {
  const server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://127.0.0.1').pathname)
      const requested = pathname === '/' ? 'renderer.html' : pathname.replace(/^\/+/, '')
      const file = resolve(root, requested)
      const fromRoot = relative(root, file)
      if (fromRoot.startsWith(`..${sep}`) || fromRoot === '..' || isAbsolute(fromRoot)) {
        response.writeHead(403).end('Forbidden')
        return
      }
      const contents = await readFile(file)
      response.writeHead(200, { 'Content-Type': MIME_TYPES[extname(file)] ?? 'application/octet-stream' })
      response.end(contents)
    } catch {
      response.writeHead(404).end('Not found')
    }
  })

  await new Promise<void>((resolveListen, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => resolveListen())
  })
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Could not start the local renderer.')
  return { server, url: `http://127.0.0.1:${address.port}/renderer.html` }
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolveClose, reject) => {
    server.close((error) => error ? reject(error) : resolveClose())
  })
}

export async function renderCompositionFile(source: string, outputPath: string, inputPath: string): Promise<void> {
  if (resolve(outputPath) === resolve(inputPath)) {
    throw new Error('The render output resolves to the input file. Choose a different output path.')
  }
  const root = await rendererRoot()
  const executablePath = await findBrowser()
  const { server, url } = await startRendererServer(root)
  let browser: Browser | undefined

  try {
    browser = await chromium.launch({
      executablePath,
      headless: true,
      args: ['--autoplay-policy=no-user-gesture-required'],
    })
    const context = await browser.newContext({ acceptDownloads: true })
    const page = await context.newPage()
    await page.goto(url, { waitUntil: 'networkidle' })
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.evaluate(async (notation) => {
        const renderer = (globalThis as unknown as { violetRender(value: string): Promise<void> }).violetRender
        await renderer(notation)
      }, source),
    ])
    const failure = await download.failure()
    if (failure) throw new Error(failure)
    await download.saveAs(resolve(outputPath))
  } finally {
    await browser?.close()
    await closeServer(server)
  }
}
