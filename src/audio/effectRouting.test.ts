import { describe, expect, it } from 'vitest'
import { effectSendGain, parallelMixInputGain, PARALLEL_DRY_GAIN, SEND_INPUT_TRIM } from './effectRouting'
import { INPUT_GAIN } from './signalPath'

describe('parallel effect routing gain contract', () => {
  it('keeps a unity dry path and trims each effect send', () => {
    expect(PARALLEL_DRY_GAIN).toBe(1)
    expect(SEND_INPUT_TRIM).toBeGreaterThan(0)
    expect(SEND_INPUT_TRIM).toBeLessThan(1)
  })

  it('compensates the parallel return sum before distortion', () => {
    expect(parallelMixInputGain(0, 0, 0, 0)).toBe(INPUT_GAIN)
    const maximum = parallelMixInputGain(1, 1, 1, 1)
    expect(maximum).toBeCloseTo(INPUT_GAIN / (1 + SEND_INPUT_TRIM * (0.5 + 0.48 + 0.52 + 0.7)))
    expect(maximum).toBeLessThan(INPUT_GAIN)
  })

  it('clamps every voice send before applying its input trim', () => {
    expect(effectSendGain(-1)).toBe(0)
    expect(effectSendGain(0.5)).toBe(SEND_INPUT_TRIM * 0.5)
    expect(effectSendGain(2)).toBe(SEND_INPUT_TRIM)
  })
})
