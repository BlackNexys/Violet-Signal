import { describe, expect, it } from 'vitest'
import {
  FORMAT_VERSION,
  cloneComposition,
  getPattern,
  makeArrangementOccurrence,
  makeEmptyComposition,
  type Composition,
} from './composition'
import {
  occurrenceAllowsVoice,
  occurrenceLayerSelection,
  resolveArrangementOccurrence,
  transposeOccurrenceNote,
  transposeOccurrenceNotes,
} from './arrangement'

describe('arrangement occurrences', () => {
  it('migrates legacy pattern letters to neutral v3 occurrences idempotently', () => {
    const legacy = { ...makeEmptyComposition(), formatVersion: 2, arrangement: ['A', 'C'] } as unknown as Composition

    const migrated = cloneComposition(legacy)
    const clonedAgain = cloneComposition(migrated)

    expect(migrated.formatVersion).toBe(FORMAT_VERSION)
    expect(migrated.arrangement).toEqual([
      { pattern: 'A', transpose: 0, rotate: 0, mute: [], layers: {}, effects: {} },
      { pattern: 'C', transpose: 0, rotate: 0, mute: [], layers: {}, effects: {} },
    ])
    expect(clonedAgain).toEqual(migrated)
  })

  it('rotates the whole occurrence memory without changing its source pattern', () => {
    const composition = makeEmptyComposition()
    const source = getPattern(composition, 'A')
    source.steps[15].notes = ['B4']
    source.steps[15].chordTie = true
    source.automation.memory[15] = 0.84
    source.automation.veil[15] = 0.61
    const occurrence = makeArrangementOccurrence('A')
    occurrence.rotate = 1
    composition.arrangement = [occurrence]

    const resolved = resolveArrangementOccurrence(composition, 0)

    expect(resolved.pattern.steps[0].notes).toEqual(['B4'])
    expect(resolved.pattern.steps[0].chordTie).toBe(true)
    expect(resolved.pattern.automation.memory[0]).toBe(0.84)
    expect(resolved.pattern.automation.veil[0]).toBe(0.61)
    expect(source.steps[0].notes).toEqual([])
    expect(source.steps[0].chordTie).toBe(false)
    expect(source.automation.memory[0]).toBeNull()
  })

  it('resolves the source pattern without mutating it and transposes only pitches', () => {
    const composition = makeEmptyComposition()
    const occurrence = makeArrangementOccurrence('B')
    occurrence.transpose = 12
    composition.arrangement = [occurrence]
    getPattern(composition, 'B').steps[0].notes = ['C4', 'Eb4']
    getPattern(composition, 'B').steps[0].bass = 'C2'

    const resolved = resolveArrangementOccurrence(composition, 0)

    expect(resolved.pattern.id).toBe('B')
    expect(transposeOccurrenceNotes(resolved.pattern.steps[0].notes, occurrence)).toEqual(['C5', 'Eb5'])
    expect(transposeOccurrenceNote(resolved.pattern.steps[0].bass!, occurrence)).toBe('C3')
    expect(resolved.pattern.steps[0].notes).toEqual(['C4', 'Eb4'])
  })

  it('combines global solo/mute with occurrence mute and layer selection', () => {
    const composition = makeEmptyComposition()
    const occurrence = makeArrangementOccurrence('A')
    occurrence.mute = ['pulse']
    occurrence.layers.chords = 'shadow'

    expect(occurrenceAllowsVoice(composition, occurrence, 'pulse')).toBe(false)
    expect(occurrenceAllowsVoice(composition, occurrence, 'chords')).toBe(true)
    expect(occurrenceLayerSelection(occurrence, 'chords')).toBe('shadow')
    expect(occurrenceLayerSelection(occurrence, 'bass')).toBe('all')

    composition.voices.bass.solo = true
    expect(occurrenceAllowsVoice(composition, occurrence, 'chords')).toBe(false)
    expect(occurrenceAllowsVoice(composition, occurrence, 'bass')).toBe(true)
  })
})
