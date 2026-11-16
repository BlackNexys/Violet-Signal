import { parseFxProject, type FxLayer, type FxProject } from './project'

export const FX_SAMPLE_RATE = 44100
const dbGain = (db: number) => Math.pow(10, db / 20)
const fadeSeconds = 0.002

/** A small, one-shot sound graph. All sources stop within the project window. */
function scheduleLayer(context: OfflineAudioContext, destination: AudioNode, layer: FxLayer): void {
  if (!layer.enabled) return
  const start = layer.startMs / 1000
  const end = (layer.startMs + layer.durationMs) / 1000
  const attackEnd = start + Math.max(0.001, layer.attackMs / 1000)
  const fadeStart = Math.max(attackEnd, end - Math.min(0.025, layer.durationMs / 1000 * 0.25))

  const amplitude = context.createGain()
  amplitude.gain.setValueAtTime(0, start)
  amplitude.gain.linearRampToValueAtTime(dbGain(layer.levelDb), attackEnd)
  amplitude.gain.setValueAtTime(dbGain(layer.levelDb), fadeStart)
  amplitude.gain.linearRampToValueAtTime(0, end)

  // Quantized amplitude gives a controllable damaged-digital color.
  // This does not pretend to emulate a sample-rate-reduced console chip.
  const quantizer = context.createWaveShaper()
  const levels = Math.pow(2, layer.bits - 1) - 1
  const curve = new Float32Array(2049)
  for (let i = 0; i < curve.length; i++) {
    const input = (i / (curve.length - 1)) * 2 - 1
    curve[i] = Math.round(input * levels) / levels
  }
  quantizer.curve = curve
  quantizer.oversample = 'none'

  const filter = context.createBiquadFilter()
  filter.type = layer.engine === 'noise' ? 'bandpass' : 'lowpass'
  filter.frequency.value = layer.filterHz
  filter.Q.value = layer.engine === 'noise' ? 0.7 : 0.9
  amplitude.connect(filter)
  filter.connect(quantizer)
  quantizer.connect(destination)

  if (layer.engine === 'noise') {
    const length = Math.ceil((end - start + fadeSeconds) * context.sampleRate)
    const buffer = context.createBuffer(1, length, context.sampleRate)
    const data = buffer.getChannelData(0)
    let seed = layer.id === 'transient' ? 113 : layer.id === 'body' ? 719 : 1949
    for (let i = 0; i < data.length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
      data[i] = seed / 2147483648 - 1
    }
    const noise = context.createBufferSource()
    noise.buffer = buffer
    noise.connect(amplitude)
    noise.start(start)
    noise.stop(end)
    return
  }

  const carrier = context.createOscillator()
  carrier.type = layer.engine === 'metal' ? 'triangle' : 'sine'
  carrier.frequency.setValueAtTime(layer.frequency, start)
  carrier.frequency.exponentialRampToValueAtTime(layer.endFrequency, end)
  carrier.connect(amplitude)
  carrier.start(start)
  carrier.stop(end)

  const secondary = context.createOscillator()
  secondary.type = layer.engine === 'metal' ? 'square' : 'sine'
  secondary.frequency.setValueAtTime(layer.frequency * (layer.engine === 'metal' ? 1.41 : 2), start)
  secondary.frequency.exponentialRampToValueAtTime(layer.endFrequency * (layer.engine === 'metal' ? 1.41 : 2), end)
  if (layer.engine === 'fm') {
    const modDepth = context.createGain()
    modDepth.gain.value = layer.frequency * 0.55
    secondary.connect(modDepth)
    modDepth.connect(carrier.frequency)
  } else {
    const layerMix = context.createGain()
    layerMix.gain.value = 0.24
    secondary.connect(layerMix)
    layerMix.connect(amplitude)
  }
  secondary.start(start)
  secondary.stop(end)
}

/** Offline and preview share precisely the same rendered buffer. No auto peak normalization. */
export async function renderFxAudio(project: FxProject): Promise<AudioBuffer> {
  const valid = parseFxProject(JSON.stringify(project))
  const context = new OfflineAudioContext(2, Math.ceil(valid.durationMs / 1000 * FX_SAMPLE_RATE), FX_SAMPLE_RATE)
  const master = context.createGain()
  master.gain.value = dbGain(valid.masterDb)
  master.connect(context.destination)
  valid.layers.forEach((layer) => scheduleLayer(context, master, layer))
  return context.startRendering()
}

export function fxPeak(buffer: Pick<AudioBuffer, 'numberOfChannels' | 'getChannelData'>): number {
  let peak = 0
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const values = buffer.getChannelData(channel)
    for (let index = 0; index < values.length; index++) peak = Math.max(peak, Math.abs(values[index]))
  }
  return peak
}

/** Unnormalized 16-bit PCM master. One-shot SFX should keep their authored relative loudness. */
export function encodeFxWav(buffer: Pick<AudioBuffer, 'length' | 'sampleRate' | 'numberOfChannels' | 'getChannelData'>): Blob {
  const channels = Math.min(2, buffer.numberOfChannels)
  if (channels < 1) throw new Error('WAV requires an audio channel')
  const bytes = buffer.length * channels * 2
  const raw = new ArrayBuffer(44 + bytes)
  const view = new DataView(raw)
  const signature = (offset: number, name: string) => {
    for (let i = 0; i < name.length; i++) view.setUint8(offset + i, name.charCodeAt(i))
  }
  signature(0, 'RIFF')
  view.setUint32(4, 36 + bytes, true)
  signature(8, 'WAVE')
  signature(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, channels, true)
  view.setUint32(24, buffer.sampleRate, true)
  view.setUint32(28, buffer.sampleRate * channels * 2, true)
  view.setUint16(32, channels * 2, true)
  view.setUint16(34, 16, true)
  signature(36, 'data')
  view.setUint32(40, bytes, true)
  const data = Array.from({ length: channels }, (_, channel) => buffer.getChannelData(channel))
  let cursor = 44
  for (let frame = 0; frame < buffer.length; frame++) {
    for (let channel = 0; channel < channels; channel++) {
      const sample = Math.max(-1, Math.min(1, data[channel][frame]))
      view.setInt16(cursor, Math.round(sample < 0 ? sample * 32768 : sample * 32767), true)
      cursor += 2
    }
  }
  return new Blob([raw], { type: 'audio/wav' })
}
