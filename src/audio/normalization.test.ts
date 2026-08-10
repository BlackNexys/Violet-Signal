import { describe, expect, it } from 'vitest'
import { decibelsToGain, measurePeak, peakNormalizationGain, WAV_PEAK_CEILING_DB } from './normalization'

function audioBufferWith(...channels: number[][]): AudioBuffer {
  const data = channels.map((samples) => new Float32Array(samples))
  return {
    numberOfChannels: data.length,
    getChannelData: (channel: number) => data[channel],
  } as AudioBuffer
}

describe('WAV peak normalization', () => {
  it('measures the absolute peak across every channel', () => {
    expect(measurePeak(audioBufferWith([0.1, -0.4], [0.82, -0.2]))).toBeCloseTo(0.82)
  })

  it('places non-silent output at the configured ceiling', () => {
    const peak = 0.25
    const gain = peakNormalizationGain(peak)
    expect(peak * gain).toBeCloseTo(decibelsToGain(WAV_PEAK_CEILING_DB))
  })

  it('does not amplify silence or invalid measurements', () => {
    expect(peakNormalizationGain(0)).toBe(1)
    expect(peakNormalizationGain(Number.NaN)).toBe(1)
  })
})
