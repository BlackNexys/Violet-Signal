import { describe, expect, it } from 'vitest'
import { getScene, scenes } from '../model/scenes'
import { parseComposition } from './parser'
import { serializeComposition } from './serializer'
import { FORMAT_VERSION, makeEmptyComposition } from '../model/composition'
import { applyInstrumentPatch } from '../model/instrumentPacks'

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
    expect(result.composition.voices.bass).toMatchObject({ filterType: 'bandpass', resonance: 4.2, glide: 0.12 })
    expect(result.composition.voices.bass.layers.primary.detune).toBe(-7)
    expect(result.composition.formatVersion).toBe(FORMAT_VERSION)
    expect(result.composition.patterns[0].steps[6].probability).toBe(0.65)
    expect(result.composition.patterns[0].steps[10].ratchets).toBe(3)
    expect(result.composition.patterns[0].steps[2].microShift).toBe(-0.08)
    const roundTrip = parseComposition(serializeComposition(result.composition))
    expect(roundTrip.ok && roundTrip.composition).toEqual(result.composition)
  })

  it('round-trips Linear automation while canonicalizing explicit Hold', () => {
    const result = parseComposition(`scene "Interpolated Memory" {
  automate memory A linear: 01=0.2 09=0.8
  automate veil A hold: 01=0.3 09=0.7
}`)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.composition.patterns[0].automationModes).toMatchObject({ memory: 'linear', veil: 'hold' })
    const canonical = serializeComposition(result.composition)
    expect(canonical).toContain('automate memory A linear: 01=0.2 09=0.8')
    expect(canonical).toContain('automate veil A: 01=0.3 09=0.7')
    expect(canonical).not.toContain('automate veil A hold:')
    const roundTrip = parseComposition(canonical)
    expect(roundTrip.ok && roundTrip.composition).toEqual(result.composition)
  })

  it('round-trips explicit Chord and Bass ties independently from gate length', () => {
    const result = parseComposition(`scene "Connected Signal" {
  notes A: 01=C4+Eb4+G4> 02=D4+F4+A4~2>
  bass A: 01=C2> 02=D2~4
}`)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    const [first, second] = result.composition.patterns[0].steps
    expect(first).toMatchObject({ chordTie: true, bassTie: true })
    expect(second).toMatchObject({ chordTie: true, bassTie: false, chordLength: 2, bassLength: 4 })
    const canonical = serializeComposition(result.composition)
    expect(canonical).toContain('notes A: 01=C4+Eb4+G4> 02=D4+F4+A4~2>')
    expect(canonical).toContain('bass A: 01=C2> 02=D2~4')
    const roundTrip = parseComposition(canonical)
    expect(roundTrip.ok && roundTrip.composition).toEqual(result.composition)
  })

  it('rejects a tie marker placed before note length', () => {
    const result = parseComposition('scene "Broken Tie" {\n  bass A: 01=C2>~4\n}')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.message).toContain('05=C4~4>')
  })

  it('rejects unsupported automation interpolation modes', () => {
    const result = parseComposition('scene "Unsupported Curve" {\n  automate veil A ease: 01=0.2 09=0.8\n}')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.message).toContain('optional “hold” or “linear”')
  })

  it('round-trips explicit layered patches in the current format', () => {
    const layered = applyInstrumentPatch(makeEmptyComposition(), 'chords', 'veil-archive/glass-choir@1')
    const result = parseComposition(serializeComposition(layered))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.composition).toEqual(layered)
    expect(result.composition.voices.chords.layers).toMatchObject({
      primary: { engine: 'am', enabled: true },
      shadow: { engine: 'fm', enabled: true, octave: 1 },
    })
  })

  it('rejects an engine that is incompatible with its voice role', () => {
    const result = parseComposition('scene "Wrong Engine" {\n  voice pulse: sine engine=fm\n}')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.message).toContain('not available for the pulse voice')
  })

  it('round-trips the expanded engine vocabulary through compatible layers', () => {
    const source = serializeComposition(makeEmptyComposition())
      .replace('engine=subtractive', 'engine=dual')
      .replace('layer chords shadow: off engine=subtractive', 'layer chords shadow: on engine=pluck')
      .replace('voice pulse: sine engine=membrane', 'voice pulse: sine engine=metal')
      .replace('voice texture: sawtooth engine=noise', 'voice texture: sawtooth engine=metal')
    const result = parseComposition(source)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.composition.voices.chords.layers).toMatchObject({ primary: { engine: 'dual' }, shadow: { engine: 'pluck', enabled: true } })
    expect(result.composition.voices.pulse.layers.primary.engine).toBe('metal')
    expect(result.composition.voices.texture.layers.primary.engine).toBe('metal')
    expect(parseComposition(serializeComposition(result.composition))).toEqual({ ok: true, composition: result.composition })
  })

  it.each(['dorian', 'phrygian', 'harmonic minor', 'melodic minor', 'pentatonic'] as const)('round-trips the %s scale mode', (mode) => {
    const source = serializeComposition(makeEmptyComposition()).replace('scale: C minor', `scale: F# ${mode}`)
    const result = parseComposition(source)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.composition.scaleMode).toBe(mode)
    expect(serializeComposition(result.composition)).toContain(`scale: F# ${mode}`)
  })

  it('marks hand-edited patch settings as custom while keeping explicit values', () => {
    const layered = applyInstrumentPatch(makeEmptyComposition(), 'chords', 'veil-archive/glass-choir@1')
    const edited = serializeComposition(layered).replace('character=0.42', 'character=0.43')
    const result = parseComposition(edited)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.composition.voices.chords.patchId).toBeNull()
    expect(result.composition.voices.chords.layers.primary.character).toBe(0.43)
  })

  it('round-trips transformed arrangement occurrences in canonical order', () => {
    const source = serializeComposition(makeEmptyComposition()).replace(
      /^ {2}arrangement:.*$/m,
      '  arrangement: A C[effects=overclock:-0.2+mask:1.5+memory:0.25,layers=bass:primary+chords:shadow,mute=texture+pulse,rotate=-3,transpose=12]',
    )

    const result = parseComposition(source)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.composition.arrangement[1]).toEqual({
      pattern: 'C',
      transpose: 12,
      rotate: -3,
      mute: ['pulse', 'texture'],
      layers: { bass: 'primary', chords: 'shadow' },
      effects: { overclock: -0.2, mask: 1.5, memory: 0.25 },
    })
    expect(serializeComposition(result.composition)).toContain(
      'arrangement: A C[transpose=12,rotate=-3,mute=pulse+texture,layers=chords:shadow+bass:primary,effects=mask:1.5+memory:0.25+overclock:-0.2]',
    )
    const roundTrip = parseComposition(serializeComposition(result.composition))
    expect(roundTrip.ok && roundTrip.composition).toEqual(result.composition)
  })

  it.each([
    ['A[transpose=25]', 'can range from -24 to 24'],
    ['A[mute=signal]', 'mute can use'],
    ['A[layers=chords:shadow+chords:primary]', 'more than once'],
    ['A[rotate=64]', 'can range from -63 to 63'],
    ['A[effects=mask:0.1]', 'can range from 0.25 to 4'],
    ['A[effects=veil:2]', 'can range from -1 to 1'],
    ['A[effects=memory:0.2+memory:0.3]', 'more than once'],
  ])('rejects invalid occurrence %s', (occurrence, message) => {
    const result = parseComposition(`scene "Wrong Occurrence" {\n  arrangement: ${occurrence}\n}`)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.message).toContain(message)
  })
})
