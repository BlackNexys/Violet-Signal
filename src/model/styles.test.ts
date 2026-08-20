import { describe, expect, it } from 'vitest'
import { getPattern, makeEmptyComposition } from './composition'
import { applyStyle, DEFAULT_STYLE_PRESERVE, STYLE_DEFINITIONS } from './styles'

const replaceEverything = {
  tempo: false,
  timing: false,
  harmony: false,
  patterns: false,
  arrangement: false,
  voices: false,
  effects: false,
}

describe('data-driven style registry', () => {
  it('contains unique stable ids across a broad synth vocabulary', () => {
    const ids = STYLE_DEFINITIONS.map((style) => style.id)
    expect(ids).toHaveLength(19)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toEqual(expect.arrayContaining(['ambient', 'synthpop', 'witch-house', 'house', 'acid', 'drum-and-bass', 'industrial-ebm', 'chiptune', 'glitch', 'cinematic']))
    expect(new Set(STYLE_DEFINITIONS.map((style) => style.harmony.mode))).toEqual(
      new Set(['minor', 'major', 'dorian', 'phrygian', 'harmonic minor', 'melodic minor', 'pentatonic']),
    )
  })

  it.each(STYLE_DEFINITIONS.map((style) => [style.id] as const))('applies %s inside the composition contract', (id) => {
    const next = applyStyle(makeEmptyComposition(), id, 1, replaceEverything)
    expect(next.world).toBe(id)
    expect(next.bpm).toBeGreaterThanOrEqual(40)
    expect(next.bpm).toBeLessThanOrEqual(220)
    expect(next.patterns.every((pattern) => pattern.steps.length === next.stepCount)).toBe(true)
    expect(next.patterns.every((pattern) => Object.values(pattern.automation).every((lane) => lane.length === next.stepCount))).toBe(true)
    expect(next.patterns.flatMap((pattern) => pattern.steps).every((step) => step.probability >= 0 && step.probability <= 1 && step.ratchets >= 1 && step.ratchets <= 4)).toBe(true)
  })

  it('preserves authored notes by default and produces deterministic transformations', () => {
    const original = makeEmptyComposition()
    getPattern(original, 'A').steps[0].notes = ['C4', 'Eb4', 'G4']
    const first = applyStyle(original, 'acid', 0.75, DEFAULT_STYLE_PRESERVE, [{ id: 'ambient', amount: 0.2 }])
    const second = applyStyle(original, 'acid', 0.75, DEFAULT_STYLE_PRESERVE, [{ id: 'ambient', amount: 0.2 }])
    expect(getPattern(first, 'A').steps[0].notes).toEqual(['C4', 'Eb4', 'G4'])
    expect(first).toEqual(second)
    expect(first.styleInfluences).toEqual([{ id: 'ambient', amount: 0.2 }])
  })
})
