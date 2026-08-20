import { describe, expect, it } from 'vitest'
import { chordSuggestions, makeEmptyComposition, notesForScale, SCALE_INTERVALS, SCALE_MODES } from './composition'

describe('scale vocabulary', () => {
  it('keeps every mode in one bounded interval registry', () => {
    expect(Object.keys(SCALE_INTERVALS)).toEqual([...SCALE_MODES])
    for (const mode of SCALE_MODES) {
      expect(SCALE_INTERVALS[mode][0]).toBe(0)
      expect(SCALE_INTERVALS[mode].every((interval) => interval >= 0 && interval < 12)).toBe(true)
      expect(notesForScale('C', mode)).toHaveLength(8)
    }
  })

  it.each([
    ['dorian', ['C4', 'D4', 'Eb4', 'F4', 'G4', 'A4', 'Bb4', 'C5']],
    ['phrygian', ['C4', 'C#4', 'Eb4', 'F4', 'G4', 'Ab4', 'Bb4', 'C5']],
    ['harmonic minor', ['C4', 'D4', 'Eb4', 'F4', 'G4', 'Ab4', 'B4', 'C5']],
    ['melodic minor', ['C4', 'D4', 'Eb4', 'F4', 'G4', 'A4', 'B4', 'C5']],
    ['pentatonic', ['C4', 'Eb4', 'F4', 'G4', 'Bb4', 'C5', 'Eb5', 'F5']],
  ] as const)('resolves %s notes', (mode, notes) => {
    expect(notesForScale('C', mode)).toEqual(notes)
  })

  it('builds five valid suggestions for a pentatonic scale', () => {
    const composition = makeEmptyComposition()
    composition.scaleMode = 'pentatonic'
    const suggestions = chordSuggestions(composition)
    expect(suggestions).toHaveLength(5)
    expect(suggestions.every((chord) => chord.notes.length === 3)).toBe(true)
  })
})
