import { describe, expect, it } from 'vitest'
import { engineMonitorTrimDb, mapLayerCharacter, monotonicLiveStartTime, NEUTRAL_VOICE_MODIFIERS } from './instrumentSource'

describe('layered instrument mappings', () => {
  it('keeps FM and AM character mappings bounded', () => {
    expect(mapLayerCharacter('fm', -1)).toEqual({ harmonicity: 0.5, modulationIndex: 0.5 })
    expect(mapLayerCharacter('fm', 2)).toEqual({ harmonicity: 4, modulationIndex: 12 })
    expect(mapLayerCharacter('am', -1)).toEqual({ harmonicity: 0.5 })
    expect(mapLayerCharacter('am', 2)).toEqual({ harmonicity: 5 })
  })

  it('maps membrane character without unsafe pitch ranges', () => {
    expect(mapLayerCharacter('membrane', 0)).toEqual({ pitchDecay: 0.01, octaves: 2 })
    expect(mapLayerCharacter('membrane', 1)).toEqual({ pitchDecay: 0.08, octaves: 7 })
  })

  it('keeps dual, pluck, and metal macros inside their profiled ranges', () => {
    expect(mapLayerCharacter('dual', 0)).toEqual({ harmonicity: 0.995, vibratoAmount: 0.015, vibratoRate: 0.4 })
    expect(mapLayerCharacter('dual', 1)).toEqual({ harmonicity: 1.005, vibratoAmount: 0.175, vibratoRate: 5 })
    expect(mapLayerCharacter('pluck', 0)).toEqual({ attackNoise: 0.5, dampening: 1200, resonance: 0.7 })
    expect(mapLayerCharacter('pluck', 1)).toEqual({ attackNoise: 2.3, dampening: 6000, resonance: 0.97 })
    expect(mapLayerCharacter('metal', 0)).toEqual({ harmonicity: 2.5, modulationIndex: 12, octaves: 0.5, resonance: 180 })
    expect(mapLayerCharacter('metal', 1)).toEqual({ harmonicity: 6, modulationIndex: 40, octaves: 4, resonance: 3380 })
  })

  it('calibrates real-time engine monitoring without affecting neutral rendering', () => {
    expect(engineMonitorTrimDb('fm')).toBe(10)
    expect(engineMonitorTrimDb('am')).toBe(14)
    expect(engineMonitorTrimDb('dual')).toBe(-3)
    expect(engineMonitorTrimDb('metal')).toBe(-6)
    expect(NEUTRAL_VOICE_MODIFIERS.liveMonitoring).toBe(false)
  })

  it('keeps late real-time source starts strictly ordered', () => {
    expect(monotonicLiveStartTime(10.2, 10, 9)).toBe(10.2)
    const late = monotonicLiveStartTime(9.8, 10, 9.9)
    expect(late).toBeCloseTo(10.002)
    expect(monotonicLiveStartTime(9.8, 10, late)).toBeCloseTo(10.003)
  })
})
