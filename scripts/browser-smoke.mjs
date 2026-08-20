import { mkdir, readFile } from 'node:fs/promises'
import { chromium } from 'playwright-core'

const baseUrl = process.env.VIOLET_SIGNAL_URL ?? 'http://127.0.0.1:4173'
const executablePath = process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const browser = await chromium.launch({
  headless: true,
  executablePath,
  args: ['--autoplay-policy=no-user-gesture-required'],
})

const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
const failures = []
page.on('pageerror', (error) => failures.push(`pageerror: ${error.message}`))
page.on('console', (message) => {
  if (message.type() === 'error') failures.push(`console: ${message.text()} (${message.location().url})`)
})
page.on('response', (response) => {
  if (response.status() >= 400) failures.push(`http ${response.status()}: ${response.url()}`)
})

const expect = (condition, message) => {
  if (!condition) throw new Error(message)
}

try {
  await page.goto(baseUrl, { waitUntil: 'networkidle' })
  await mkdir('artifacts', { recursive: true })
  expect((await page.title()) === 'Violet Signal', 'document title did not load')
  await page.getByRole('heading', { name: 'Instrument' }).waitFor()
  await page.getByRole('heading', { name: 'Sequence' }).waitFor()
  await page.getByRole('heading', { name: 'Code' }).waitFor()
  expect((await page.locator('#scene-select option').count()) === 7, 'soundverse scene library did not load')
  await page.getByText('Witch House', { exact: true }).waitFor()
  await page.getByText('Veil', { exact: true }).first().waitFor()
  await page.getByText('Fracture', { exact: true }).first().waitFor()

  await page.getByRole('button', { name: 'Style Lab', exact: true }).click()
  await page.getByRole('heading', { name: 'Style Lab' }).waitFor()
  expect((await page.locator('.style-lab__list > button').count()) === 19, 'complete style registry did not load')
  await page.screenshot({ path: 'artifacts/violet-signal-style-lab.png', fullPage: true })
  await page.getByRole('button', { name: 'Close Style Lab' }).click()

  await page.getByRole('button', { name: 'Tutorial', exact: true }).click()
  await page.getByRole('heading', { name: 'Begin with a gesture' }).waitFor()
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await page.getByRole('heading', { name: 'Styles are transformable recipes' }).waitFor()
  expect(await page.locator('.tutorial-target').evaluate((element) => element.matches('.style-lab-launch')), 'tutorial did not highlight Style Lab')
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await page.getByRole('heading', { name: 'Select before you write' }).waitFor()
  expect((await page.locator('.tutorial-target').count()) === 1, 'tutorial did not highlight its current control')
  expect(await page.locator('.tutorial-target').evaluate((element) => element.matches('.sequencer-scroll')), 'tutorial step 2 did not highlight the sequencer')
  await page.getByRole('button', { name: 'Close tutorial' }).click()
  await page.getByRole('button', { name: 'Cheatsheet', exact: true }).click()
  await page.getByRole('heading', { name: 'Violet Signal cheatsheet' }).waitFor()
  await page.getByRole('button', { name: 'Styles', exact: true }).click()
  await page.getByText('Fractured Broadcast · 136 bpm').waitFor()
  await page.getByRole('button', { name: 'Notation', exact: true }).click()
  await page.getByText('05=C4+Eb4+G4~4', { exact: false }).first().waitFor()
  await page.getByRole('button', { name: 'Close cheatsheet' }).click()

  const editor = page.locator('.cm-content')
  const stepTwoPulse = page.getByRole('button', { name: /Step 2 percussion/ })
  await stepTwoPulse.click()
  expect((await stepTwoPulse.getAttribute('aria-pressed')) === 'true', 'sequencer step did not toggle')

  const stepTwoChord = page.getByRole('button', { name: /Step 2 chord/ })
  await stepTwoChord.click()
  const secondTouchKey = page.locator('.touch-keyboard button').nth(1)
  const assignedPitch = `${await secondTouchKey.locator('span').innerText()}${await secondTouchKey.locator('small').innerText()}`
  await secondTouchKey.click()
  expect((await stepTwoChord.getAttribute('aria-label'))?.includes(assignedPitch), 'touch key did not assign the displayed pitch to the selected step')

  const tempoLine = page.locator('.cm-line').filter({ hasText: 'tempo:' }).first()
  await tempoLine.click()
  await page.keyboard.press('Home')
  await page.keyboard.press('Shift+End')
  await page.keyboard.type('  tempo: 101')
  await page.getByText('Signal in tune · changes are live').waitFor()
  await tempoLine.click()
  await page.keyboard.press('Home')
  await page.keyboard.press('Shift+End')
  await page.keyboard.type('  tempo: 999')
  await page.getByText(/Line \d+:/).waitFor()
  await tempoLine.click()
  await page.keyboard.press('Home')
  await page.keyboard.press('Shift+End')
  await page.keyboard.type('  tempo: 101')
  await page.getByText('Signal in tune · changes are live').waitFor()
  expect((await tempoLine.innerText()).trim() === 'tempo: 101', `editor caret moved during correction: ${await tempoLine.innerText()}`)

  const enableAudio = page.getByRole('button', { name: 'Enable audio' })
  if (await enableAudio.count()) await enableAudio.click()
  await page.getByText('Audio ready').waitFor()
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await page.getByRole('button', { name: 'Pause' }).waitFor()
  const loopTiming = await page.evaluate(() => new Promise((resolve, reject) => {
    const label = document.querySelector('.transport-state span')
    if (!label) { reject(new Error('transport status was not found')); return }
    const changes = []
    let sawLastStep = false
    const timeout = window.setTimeout(() => { observer.disconnect(); reject(new Error('transport did not complete a loop')) }, 8_000)
    const sample = () => {
      const match = /Playing · (\d+)/.exec(label.textContent ?? '')
      if (!match) return
      const step = Number(match[1])
      const reading = { step, at: performance.now() }
      if (changes.at(-1)?.step !== step) changes.push(reading)
      if (step === 16) sawLastStep = true
      if (sawLastStep && step === 1) {
        window.clearTimeout(timeout)
        observer.disconnect()
        resolve(changes.slice(-3))
      }
    }
    const observer = new MutationObserver(sample)
    observer.observe(label, { characterData: true, childList: true, subtree: true })
    sample()
  }))
  const beforeSeam = loopTiming.at(-3)
  const seamStart = loopTiming.at(-2)
  const seamEnd = loopTiming.at(-1)
  expect(beforeSeam?.step === 15 && seamStart?.step === 16 && seamEnd?.step === 1, `unexpected loop sequence: ${JSON.stringify(loopTiming)}`)
  const regularInterval = seamStart.at - beforeSeam.at
  const seamInterval = seamEnd.at - seamStart.at
  expect(seamInterval <= regularInterval * 1.35 + 35, `loop seam stalled for ${Math.round(seamInterval)} ms after a ${Math.round(regularInterval)} ms step`)
  await page.getByRole('button', { name: 'Stop and return to step one' }).click()

  await page.getByRole('button', { name: 'Capture', exact: true }).click()
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await page.waitForTimeout(250)
  await page.getByRole('button', { name: 'Stop and return to step one' }).click()
  const captureDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Stop capture', exact: true }).click()
  expect((await captureDownload).suggestedFilename().endsWith('.webm'), 'audio capture did not produce a WebM file')

  await page.getByRole('textbox', { name: 'Snapshot name' }).fill('Smoke memory')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await page.getByText('Saved “Smoke memory”').waitFor()

  await page.locator('#scene-select').selectOption('fractured-broadcast')
  await page.getByText('Glitch / IDM', { exact: true }).waitFor()
  expect((await editor.innerText()).includes('style: glitch'), 'style scene did not reach code')
  await page.getByRole('combobox', { name: 'Sound patch' }).selectOption('veil-archive/glass-choir@1')
  await page.getByText('Slow AM pad with an FM octave shadow').waitFor()
  expect((await editor.innerText()).includes('patch chords: veil-archive/glass-choir@1'), 'layered patch did not reach code')
  expect((await editor.innerText()).includes('layer chords shadow: on engine=fm'), 'shadow layer did not serialize')

  const wavDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'WAV', exact: true }).click()
  const wav = await wavDownload
  expect(wav.suggestedFilename().endsWith('.wav'), 'offline arrangement render did not produce a WAV file')
  const wavPath = await wav.path()
  expect(wavPath, 'offline WAV did not finish writing to disk')
  const wavBytes = await readFile(wavPath)
  let wavPeak = 0
  for (let offset = 44; offset + 1 < wavBytes.length; offset += 2) wavPeak = Math.max(wavPeak, Math.abs(wavBytes.readInt16LE(offset)) / 32768)
  expect(wavPeak >= 0.885 && wavPeak <= 0.895, `normalized WAV peak was ${wavPeak.toFixed(4)} instead of -1 dBFS`)

  await mkdir('artifacts', { recursive: true })
  await page.screenshot({ path: 'artifacts/violet-signal-desktop.png', fullPage: true })

  await page.setViewportSize({ width: 720, height: 1000 })
  for (const tab of ['Instrument', 'Sequence', 'Code']) {
    await page.getByRole('button', { name: tab, exact: true }).click()
    await page.getByRole('heading', { name: tab }).waitFor({ state: 'visible' })
    const visiblePanels = await page.locator('.panel-slot').evaluateAll((elements) => elements.filter((element) => getComputedStyle(element).display !== 'none').length)
    expect(visiblePanels === 1, `narrow ${tab} layout shows ${visiblePanels} panels instead of one`)
  }
  await page.screenshot({ path: 'artifacts/violet-signal-narrow.png', fullPage: true })

  if (failures.length) throw new Error(failures.join('\n'))
  console.log('Browser smoke passed: styles, learning, layered patches, synchronization, parser protection, audio effects, capture, WAV, and responsive tabs.')
} finally {
  await browser.close()
}
