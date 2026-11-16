import { describe, expect, it } from 'vitest'
import { encodeFxWav, fxPeak } from './synthesis'

describe('FX WAV encoding', () => {
  it('keeps its authored amplitude and sample length without normalization', async () => {
    const channel = new Float32Array([0, 0.25, -0.5, 0.25])
    const buffer = { length: 4, sampleRate: 44100, numberOfChannels: 1, getChannelData: () => channel }
    const bytes = await encodeFxWav(buffer).arrayBuffer()
    const wav = new DataView(bytes)
    expect(bytes.byteLength).toBe(52)
    expect(wav.getUint16(22, true)).toBe(1)
    expect(wav.getUint32(24, true)).toBe(44100)
    expect(wav.getUint32(40, true)).toBe(8)
    expect(wav.getInt16(44, true)).toBe(0)
    expect(wav.getInt16(46, true)).toBe(8192)
    expect(wav.getInt16(48, true)).toBe(-16384)
    expect(fxPeak(buffer)).toBe(0.5)
  })
  it('interleaves stereo channels without mixing them down', async () => {
    const left = Float32Array.from([0.5, 0])
    const right = Float32Array.from([0, -0.5])
    const buffer = { length: 2, sampleRate: 44100, numberOfChannels: 2,
      getChannelData: (index: number) => index === 0 ? left : right }
    const wav = new DataView(await encodeFxWav(buffer).arrayBuffer())
    expect(wav.getInt16(44, true)).toBe(16384)
    expect(wav.getInt16(46, true)).toBe(0)
    expect(wav.getInt16(48, true)).toBe(0)
    expect(wav.getInt16(50, true)).toBe(-16384)
  })
})
