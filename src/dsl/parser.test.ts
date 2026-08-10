import { describe, expect, it } from 'vitest'
import { getScene, scenes } from '../model/scenes'
import { parseComposition } from './parser'
import { serializeComposition } from './serializer'

describe('Violet Signal DSL', () => {
  it.each(scenes.map((scene) => [scene.name, scene.id] as const))('round-trips %s without losing composition data', (_, id) => {
    const composition = getScene(id)
    const result = parseComposition(serializeComposition(composition))
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.composition).toEqual(composition)
  })

  it('accepts the compact teaching syntax from the product brief', () => {
    const source = `track "Violet Signal" {
  instrument: violet-glass
  notes: C4 Eb4 G4 Bb4
  pattern: x... x.x. ..x. x...
  filter: 2800
  memory: 0.28
  ghost: 0.12
  humanize: 0.03
  overclock: 0.00
}`
    const result = parseComposition(source)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.composition.patterns[0].steps.map((step) => step.notes.length > 0)).toEqual([
        true, false, false, false, true, false, true, false,
        false, false, true, false, true, false, false, false,
      ])
      expect(result.composition.patterns[0].steps[0].notes).toEqual(['C4', 'Eb4', 'G4', 'Bb4'])
    }
  })

  it('points to the exact line with a musical step-count error', () => {
    const source = `scene "Short Circuit" {
  rhythm: x . . x . . x . . x . .
}`
    const result = parseComposition(source)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.line).toBe(2)
      expect(result.error.message).toBe('Rhythm has 12 steps; this scene expects 16.')
      expect(result.error.excerpt).toContain('rhythm:')
    }
  })

  it('rejects unknown controls without exposing an implementation error', () => {
    const result = parseComposition('scene "Unknown" {\n  laser: 9000\n}')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.message).toContain('not a control')
      expect(result.error.message).not.toContain('Error')
    }
  })

  it('uses deterministic silence when a pattern note line is removed', () => {
    const scene = getScene('rain-behind-glass')
    const withoutPatternA = serializeComposition(scene).replace(/^\s*notes A:.*\n/m, '')
    const result = parseComposition(withoutPatternA)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.composition.patterns[0].steps.every((step) => step.notes.length === 0)).toBe(true)
      expect(result.composition.patterns[1].steps.some((step) => step.notes.length > 0)).toBe(true)
    }
  })

  it('reports malformed sparse assignments on their exact line', () => {
    const result = parseComposition('scene "Wrong Step" {\n  notes A: 17=C4\n}')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.line).toBe(2)
      expect(result.error.message).toContain('outside this 16-step bar')
    }
  })

  it('round-trips flexible timing, style blends, voice character, and step expression', () => {
    const source = `scene "Odd Transmission" {
  style: glitch
  influences: ambient=0.2
  tempo: 136
  meter: 7/8
  steps: 14
  swing: 0.11
  voice bass: sawtooth filter=bandpass cutoff=1200 resonance=4.2 detune=-7 glide=0.12 volume=-9 attack=0.01 decay=0.2 sustain=0.4 release=0.3 mute=off solo=off
  chance A: 07=0.65
  ratchet A: 11=3
  shift A: 03=-0.08
}`
    const result = parseComposition(source)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.composition.stepCount).toBe(14)
    expect(result.composition.patterns.every((pattern) => pattern.steps.length === 14)).toBe(true)
    expect(result.composition.voices.bass).toMatchObject({ filterType: 'bandpass', resonance: 4.2, detune: -7, glide: 0.12 })
    expect(result.composition.patterns[0].steps[6].probability).toBe(0.65)
    expect(result.composition.patterns[0].steps[10].ratchets).toBe(3)
    expect(result.composition.patterns[0].steps[2].microShift).toBe(-0.08)
    const roundTrip = parseComposition(serializeComposition(result.composition))
    expect(roundTrip.ok && roundTrip.composition).toEqual(result.composition)
  })
})
