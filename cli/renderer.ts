import { renderCompositionToWav } from '../src/audio/offlineRender'
import { parseComposition } from '../src/dsl/parser'

declare global {
  interface Window {
    violetRender(source: string): Promise<void>
  }
}

window.violetRender = async (source) => {
  const parsed = parseComposition(source)
  if (!parsed.ok) throw new Error(`Line ${parsed.error.line}: ${parsed.error.message}`)

  const wav = await renderCompositionToWav(parsed.composition)
  const url = URL.createObjectURL(wav)
  const download = document.createElement('a')
  download.href = url
  download.download = 'violet-render.wav'
  document.body.append(download)
  download.click()
  download.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
}
