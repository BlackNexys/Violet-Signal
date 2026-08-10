import { describe, expect, it } from 'vitest'
import { mapOverclock } from './overclock'

describe('Overclock mapping', () => {
  it('adds brightness, drive, activity, and instability as pressure rises', () => {
    const calm = mapOverclock(0)
    const hard = mapOverclock(1)
    expect(hard.brightness).toBeGreaterThan(calm.brightness)
    expect(hard.drive).toBeGreaterThan(calm.drive)
    expect(hard.activityBoost).toBeGreaterThan(calm.activityBoost)
    expect(hard.pitchDriftCents).toBeGreaterThan(calm.pitchDriftCents)
    expect(hard.envelopeScale).toBeLessThan(calm.envelopeScale)
  })

  it('keeps every unsafe dimension conservatively bounded', () => {
    for (const input of [-10, 0, 0.5, 1, 10]) {
      const mapping = mapOverclock(input)
      expect(mapping.drive).toBeLessThanOrEqual(0.46)
      expect(mapping.pitchDriftCents).toBeLessThanOrEqual(9)
      expect(mapping.outputTrimDb).toBeLessThanOrEqual(0)
      expect(mapping.outputTrimDb).toBeGreaterThanOrEqual(-6)
      expect(mapping.activityBoost).toBeLessThanOrEqual(0.24)
    }
  })

  it('dims the signal during exhausted recovery', () => {
    const hot = mapOverclock(1, 0)
    const tired = mapOverclock(1, 1)
    expect(tired.brightness).toBeLessThan(hot.brightness)
    expect(tired.activityBoost).toBeLessThan(hot.activityBoost)
    expect(tired.outputTrimDb).toBeLessThan(hot.outputTrimDb)
  })
})
