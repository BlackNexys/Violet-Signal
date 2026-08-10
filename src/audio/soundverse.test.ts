import { describe, expect, it } from 'vitest'
import { mapFracture, mapVeil } from './soundverse'

describe('soundverse effect mappings', () => {
  it('keeps Veil inside a restrained chorus range', () => {
    expect(mapVeil(-1)).toEqual({ wet: 0, frequency: 0.18, depth: 0.18, delayTime: 5 })
    const maximum = mapVeil(1)
    expect(maximum.wet).toBe(0.52)
    expect(maximum.frequency).toBeCloseTo(0.9)
    expect(maximum.depth).toBeCloseTo(0.86)
    expect(maximum.delayTime).toBe(13)
  })

  it('keeps Fracture parallel-mixed with at least four bits of depth', () => {
    expect(mapFracture(-1)).toEqual({ wet: 0, bits: 16 })
    expect(mapFracture(1)).toEqual({ wet: 0.7, bits: 4 })
    expect(mapFracture(2)).toEqual({ wet: 0.7, bits: 4 })
  })
})
