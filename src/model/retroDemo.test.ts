import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseComposition } from '../dsl/parser'
import { serializeComposition } from '../dsl/serializer'
import { VOICE_IDS } from './composition'
import { getInstrumentPatch, INSTRUMENT_PATCHES } from './instrumentPacks'

describe('optional retro example', () => {
  it('loads a fully editable theme with all five voices and portable settings', () => {
    const parsed = parseComposition(readFileSync('public/examples/still-burning.violet', 'utf8'))
    if (!parsed.ok) throw new Error(JSON.stringify(parsed.error))
    const composition = parsed.composition
    expect(composition.name).toBe('Still Burning')
    expect(composition.arrangement).toHaveLength(4)
    expect(composition.patterns.every(pattern => pattern.steps.length === 32 && pattern.steps.some(step => step.signal && step.bass && step.notes.length))).toBe(true)
    for (const role of VOICE_IDS) {
      const patch = getInstrumentPatch(composition.voices[role].patchId!)!
      expect(patch.packId).toBe('underworld')
      expect(patch.role).toBe(role)
      expect(composition.voices[role].layers.primary.engine).toBe(patch.settings.layers.primary.engine)
      expect(composition.voices[role].volume).toBe(patch.settings.volume)
    }
    const roundTrip = parseComposition(serializeComposition(composition))
    expect(roundTrip).toEqual({ ok: true, composition })
    expect(INSTRUMENT_PATCHES.filter(patch => patch.packId === 'underworld')).toHaveLength(5)
  })
})
