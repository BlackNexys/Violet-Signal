import { describe, expect, it } from 'vitest'
import { mapLayerCharacter } from './instrumentSource'

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
})
