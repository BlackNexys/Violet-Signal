import { describe, expect, it } from 'vitest'
import { delayFeedback, delayWet, masterOutputDb, reverbWet, textureNoiseType } from './signalPath'

describe('shared signal path mappings', () => {
  it('keeps effect values bounded for both renderers', () => {
    expect(delayWet(2)).toBe(0.5)
    expect(delayFeedback(2)).toBe(0.58)
    expect(reverbWet(2)).toBe(0.48)
    expect(masterOutputDb(-6, 0)).toBe(-6)
    expect(masterOutputDb(-36, -6)).toBe(-42)
  })

  it('maps texture cores to the same procedural noise colors', () => {
    expect(textureNoiseType('sine')).toBe('brown')
    expect(textureNoiseType('triangle')).toBe('pink')
    expect(textureNoiseType('square')).toBe('white')
    expect(textureNoiseType('sawtooth')).toBe('white')
  })
})
