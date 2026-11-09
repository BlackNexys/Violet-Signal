import { getPattern, type Composition } from '../model/composition'

/** Export settings are transient; saved v1–v4 compositions retain their schema. */
export interface WavRenderOptions {
  loop?: { startOccurrence: number; endOccurrence: number }
}

export const WAV_SAMPLE_RATE = 44_100
export const LOOP_SEAM_SECONDS = 0.005

export function planLoopExport(composition: Composition, options: WavRenderOptions) {
  if (!options.loop) return null
  const { startOccurrence: start, endOccurrence: end } = options.loop
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end <= start || end > composition.arrangement.length) {
    throw new Error('Loop boundaries must select a nonempty arrangement range (zero-based start, exclusive end).')
  }
  const occurrences = composition.arrangement.slice(start, end)
  const steps = occurrences.reduce((sum, occurrence) => sum + getPattern(composition, occurrence.pattern).steps.length, 0)
  const seconds = steps * 60 / composition.bpm / 4
  // Warm the shared delay, reverb and sustained voices before capturing a cycle.
  const warmupSeconds = Math.max(12, ...Object.values(composition.voices).flatMap(voice =>
    Object.values(voice.layers).filter(layer => layer.enabled).map(layer => voice.release * layer.releaseScale * 3)))
  const warmupCycles = Math.max(1, Math.ceil(warmupSeconds / seconds))
  return { occurrences, start, seconds, warmupCycles, frames: Math.round(seconds * WAV_SAMPLE_RATE) }
}

/** Keep the exact musical length; blend the final 5 ms into the previous cycle's approach to the start. */
export function extractLoopChannels(buffer: { numberOfChannels: number; sampleRate: number; getChannelData(channel: number): Float32Array }, startFrame: number, frames: number): Float32Array[] {
  const seam = Math.min(Math.round(LOOP_SEAM_SECONDS * buffer.sampleRate), Math.floor(frames / 4), startFrame)
  return Array.from({ length: Math.min(2, buffer.numberOfChannels) }, (_, channel) => {
    const source = buffer.getChannelData(channel)
    if (startFrame < seam || startFrame + frames > source.length || frames < 1) throw new Error('Loop capture falls outside the rendered buffer.')
    const output = source.slice(startFrame, startFrame + frames)
    for (let index = 0; index < seam; index += 1) {
      const blend = seam > 1 ? index / (seam - 1) : 1
      const position = frames - seam + index
      output[position] = output[position] * (1 - blend) + source[startFrame - seam + index] * blend
    }
    return output
  })
}
