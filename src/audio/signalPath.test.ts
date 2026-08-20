import { describe, expect, it } from 'vitest'
import { delayFeedback, delayWet, LIVE_MONITOR_BOOST_DB, liveMonitorOutputDb, masterOutputDb, memoryDelaySeconds, reverbWet, textureNoiseType } from './signalPath'

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

  it('derives the dotted-eighth Memory delay from project tempo', () => {
    expect(memoryDelaySeconds(120)).toBe(0.375)
    expect(memoryDelaySeconds(60)).toBe(0.75)
    expect(memoryDelaySeconds(240)).toBe(0.1875)
  })

  it('adds bounded editor-only monitoring headroom', () => {
    expect(LIVE_MONITOR_BOOST_DB).toBe(12)
    expect(liveMonitorOutputDb(-13, 0)).toBe(-1)
    expect(liveMonitorOutputDb(-6, 0)).toBe(6)
    expect(liveMonitorOutputDb(-36, -6)).toBe(-30)
  })
})
