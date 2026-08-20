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
  await page.getByRole('combobox', { name: 'Scale root' }).selectOption('F#')
  await page.getByRole('combobox', { name: 'Scale mode' }).selectOption('phrygian')
  await page.waitForFunction(() => document.querySelector('.cm-content')?.textContent?.includes('scale: F# phrygian'))
  expect((await page.locator('.touch-keyboard button').nth(1).innerText()).includes('G'), 'Phrygian scale keyboard did not use its minor second')
  const automationInterpolation = page.getByRole('combobox', { name: 'Automation interpolation' })
  await automationInterpolation.selectOption('linear')
  expect(await automationInterpolation.inputValue() === 'linear', 'Linear automation mode did not remain selected')
  await page.getByRole('button', { name: /mask step 2: .* linear preview/ }).waitFor()

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
  const chordMemorySend = page.getByRole('slider', { name: 'Memory send, Delay depth' })
  await chordMemorySend.fill('0.42')
  expect(await chordMemorySend.inputValue() === '0.42', 'Chord Memory send did not update')
  const stepTwoPulse = page.getByRole('button', { name: /Step 2 percussion/ })
  await stepTwoPulse.click()
  expect((await stepTwoPulse.getAttribute('aria-pressed')) === 'true', 'sequencer step did not toggle')

  const stepTwoChord = page.getByRole('button', { name: /Step 2 chord/ })
  await stepTwoChord.click()
  const secondTouchKey = page.locator('.touch-keyboard button').nth(1)
  const assignedPitch = `${await secondTouchKey.locator('span').innerText()}${await secondTouchKey.locator('small').innerText()}`
  await secondTouchKey.click()
  expect((await stepTwoChord.getAttribute('aria-label'))?.includes(assignedPitch), 'touch key did not assign the displayed pitch to the selected step')
  await page.getByRole('checkbox', { name: /Tie to next step/ }).check()
  expect((await stepTwoChord.getAttribute('aria-label'))?.includes('tied to next step'), 'Chord tie did not reach the sequencer cell')
  await page.getByRole('button', { name: /Step 3 chord/ }).click()
  await page.locator('.touch-keyboard button').nth(2).click()

  await page.locator('.arrangement-cells button').nth(1).click()
  const occurrenceEditor = page.locator('.occurrence-editor')
  await occurrenceEditor.getByRole('button', { name: '+12', exact: true }).click()
  await occurrenceEditor.locator('.occurrence-editor__row').filter({ hasText: 'Rotate memory' }).getByRole('button', { name: '+1', exact: true }).click()
  await occurrenceEditor.getByRole('button', { name: 'Pulse', exact: true }).click()
  await occurrenceEditor.locator('select').first().selectOption('shadow')
  await occurrenceEditor.getByRole('slider', { name: 'Occurrence memory modifier' }).fill('0.25')
  await page.waitForFunction(() => document.querySelector('.cm-content')?.textContent?.includes('A[transpose=12,rotate=1,mute=pulse,layers=chords:shadow,effects=memory:0.25]'))
  const occurrenceTitle = await page.locator('.arrangement-cells button').nth(1).getAttribute('title')
  expect(occurrenceTitle?.includes('transpose +12') && occurrenceTitle.includes('rotate memory +1') && occurrenceTitle.includes('memory +0.25'), 'occurrence summary did not reflect its transformations')

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
  if (await enableAudio.count()) {
    await page.evaluate(() => {
      const buttons = [...document.querySelectorAll('button')]
      buttons.find((button) => button.textContent?.includes('Enable audio'))?.click()
      buttons.find((button) => button.getAttribute('aria-label') === 'Play')?.click()
      buttons.find((button) => button.getAttribute('aria-label') === 'Stop and return to step one')?.click()
    })
    await page.getByText('Audio ready').waitFor()
    await page.waitForTimeout(100)
    expect(await page.getByRole('button', { name: 'Play', exact: true }).isVisible(), 'Stop did not cancel Play while audio was initializing')
  }
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await page.getByRole('button', { name: 'Pause' }).waitFor()
  await page.getByRole('button', { name: 'Pause' }).click()
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await page.getByRole('button', { name: 'Pause' }).waitFor()
  await page.getByRole('button', { name: 'Stop and return to step one' }).click()
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
  const soundPatch = page.getByRole('combobox', { name: 'Sound patch' })
  await soundPatch.selectOption('chrome-wound/razor-assembly@1')
  expect(await soundPatch.inputValue() === 'chrome-wound/razor-assembly@1', 'dual patch did not remain selected')
  await page.getByText('Wide dual-oscillator saw stack').waitFor()
  await page.getByLabel('Voice controls').getByRole('button', { name: 'Signal', exact: true }).click()
  await soundPatch.selectOption('fractured-relay/needle-light@1')
  expect(await soundPatch.inputValue() === 'fractured-relay/needle-light@1', 'Signal pluck patch did not remain selected')
  await page.getByText('Physical-string lead with a narrow synth shadow').waitFor()
  await page.getByRole('button', { name: /Step 3 signal/ }).click()
  await secondTouchKey.click()
  await page.getByRole('checkbox', { name: /Tie to next step/ }).check()
  await page.getByRole('button', { name: /Step 4 signal/ }).click()
  await page.locator('.touch-keyboard button').nth(3).click()
  await page.getByLabel('Voice controls').getByRole('button', { name: 'Bass', exact: true }).click()
  await soundPatch.selectOption('fractured-relay/wire-below@1')
  expect(await soundPatch.inputValue() === 'fractured-relay/wire-below@1', 'pluck patch did not remain selected')
  await page.getByText('Short physical-string bass with a dry sub edge').waitFor()
  await page.getByLabel('Voice controls').getByRole('button', { name: 'Pulse', exact: true }).click()
  await soundPatch.selectOption('chrome-wound/iron-pulse@1')
  expect(await soundPatch.inputValue() === 'chrome-wound/iron-pulse@1', 'metal pulse patch did not remain selected')
  await page.getByLabel('Voice controls').getByRole('button', { name: 'Texture', exact: true }).click()
  await soundPatch.selectOption('chrome-wound/arc-ash@1')
  expect(await soundPatch.inputValue() === 'chrome-wound/arc-ash@1', 'metal texture patch did not remain selected')
  await page.getByText('Bright metallic debris in a noise cloud').waitFor()

  await page.getByRole('slider', { name: 'Fracture send, Bit-reduction depth' }).fill('0.15')
  await page.getByRole('slider', { name: 'Environment send, Reverb depth' }).fill('0.91')
  await page.getByLabel('Voice controls').getByRole('button', { name: 'Bass', exact: true }).click()
  await page.getByRole('slider', { name: 'Memory send, Delay depth' }).fill('0.18')
  await page.getByLabel('Voice controls').getByRole('button', { name: 'Chord', exact: true }).click()
  await page.getByRole('slider', { name: 'Veil send, Chorus depth' }).fill('0.86')

  await page.getByRole('button', { name: /Step 1 chord/ }).click()
  await page.getByRole('checkbox', { name: /Tie to next step/ }).check()
  await page.getByRole('button', { name: /Step 2 chord/ }).click()
  await secondTouchKey.click()
  await page.getByRole('button', { name: /Step 1 bass/ }).click()
  await page.getByRole('checkbox', { name: /Tie to next step/ }).check()
  await page.getByRole('button', { name: /Step 2 bass/ }).click()
  await secondTouchKey.click()

  await automationInterpolation.selectOption('linear')
  expect(await automationInterpolation.inputValue() === 'linear', 'Linear automation mode did not reach the offline render composition')

  const renderStartedAt = Date.now()
  const wavDownload = page.waitForEvent('download', { timeout: 120_000 })
  await page.getByRole('button', { name: 'WAV', exact: true }).click()
  const wav = await wavDownload
  expect(Date.now() - renderStartedAt < 90_000, 'expanded-engine WAV render exceeded the profiling budget')
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
  console.log('Browser smoke passed: scales, styles, arrangement occurrences, Hold/Linear automation, Chord/Signal/Bass ties, five-voice patches and sends, synchronization, parser protection, live audio, capture, WAV, and responsive tabs.')
} finally {
  await browser.close()
}
