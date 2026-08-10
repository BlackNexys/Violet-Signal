import { describe, expect, it } from 'vitest'
import { getPattern, makeEmptyComposition } from '../model/composition'
import { advanceFatigue, automatedValue, resolveSequencerStep } from './sequencing'

describe('shared sequencer resolution', () => {
  it('holds automation from its latest point across the loop seam', () => {
    const lane = Array.from({ length: 16 }, () => null as number | null)
    lane[4] = 0.25
    lane[12] = 0.75
    expect(automatedValue(lane, 15, 0)).toBe(0.75)
    expect(automatedValue(lane, 1, 0)).toBe(0.75)
  })

  it('resolves identical seeded events for live and offline callers', () => {
    const composition = makeEmptyComposition()
    composition.seed = 712
    composition.sound.ghost = 1
    composition.sound.humanize = 0.2
    const pattern = getPattern(composition, 'A')
    const first = resolveSequencerStep(composition, pattern, 7, 2)
    const second = resolveSequencerStep(composition, pattern, 7, 2)
    expect(second).toEqual(first)
    expect(resolveSequencerStep(composition, pattern, 0, 3).timingOffset).toBe(0)
  })

  it('uses the same bounded fatigue transition in both renderers', () => {
    let state = { heat: 0.97, exhaustion: 0 }
    state = advanceFatigue(state, 1)
    expect(state).toEqual({ heat: 0.42, exhaustion: 1 })
    state = advanceFatigue(state, 0)
    expect(state.exhaustion).toBeCloseTo(0.965)
  })
})
