import { describe, expect, it } from 'vitest'
import { cloneComposition, FORMAT_VERSION, makeEmptyComposition, type Composition } from './composition'
import { applyInstrumentPatch, INSTRUMENT_PATCHES, validateInstrumentPatches } from './instrumentPacks'

describe('layered instrument packs', () => {
  it('contains unique, compatible, bounded built-in patches', () => {
    expect(validateInstrumentPatches()).toEqual([])
    expect(new Set(INSTRUMENT_PATCHES.map((patch) => patch.id)).size).toBe(INSTRUMENT_PATCHES.length)
    expect(INSTRUMENT_PATCHES.map((patch) => patch.id)).toEqual(expect.arrayContaining([
      'blacklight-core/quiet-circuit@1',
      'blacklight-core/carrier-line@1',
      'blacklight-core/underline@1',
      'veil-archive/glass-choir@1',
      'veil-archive/undertow@1',
      'veil-archive/cold-beacon@1',
      'chrome-wound/razor-assembly@1',
      'chrome-wound/iron-pulse@1',
      'fractured-relay/wire-below@1',
      'fractured-relay/needle-light@1',
    ]))
    expect(new Set(INSTRUMENT_PATCHES.flatMap((patch) => Object.values(patch.settings.layers).map((layer) => layer.engine)))).toEqual(
      new Set(['subtractive', 'fm', 'am', 'dual', 'pluck', 'membrane', 'metal', 'noise']),
    )
  })

  it('applies a patch without mutating the source composition or registry', () => {
    const original = makeEmptyComposition()
    original.voices.chords.sends.memory = 0.23
    const registryBefore = structuredClone(INSTRUMENT_PATCHES)
    const next = applyInstrumentPatch(original, 'chords', 'veil-archive/glass-choir@1')
    expect(original.voices.chords.patchId).toBeNull()
    expect(next.voices.chords).toMatchObject({ patchId: 'veil-archive/glass-choir@1' })
    expect(next.voices.chords.layers.shadow).toMatchObject({ enabled: true, engine: 'fm', octave: 1 })
    expect(next.voices.chords.sends.memory).toBe(0.23)
    expect(INSTRUMENT_PATCHES).toEqual(registryBefore)
  })

  it('migrates legacy flat voice sources into a primary layer once', () => {
    const current = makeEmptyComposition()
    const channel = { ...current.voices.bass } as unknown as Record<string, unknown>
    delete channel.layers
    delete channel.patchId
    delete channel.sends
    const legacy = {
      ...current,
      formatVersion: undefined,
      voices: {
        ...current.voices,
        bass: { ...channel, core: 'square', detune: -9 },
      },
    } as unknown as Composition
    const migrated = cloneComposition(legacy)
    expect(migrated.formatVersion).toBe(FORMAT_VERSION)
    expect(migrated.voices.bass.layers.primary).toMatchObject({ enabled: true, engine: 'subtractive', waveform: 'square', detune: -9 })
    expect(migrated.voices.bass.layers.shadow.enabled).toBe(false)
    expect(migrated.voices.bass.sends).toEqual({ fracture: 1, veil: 1, memory: 1, environment: 1 })
    expect(cloneComposition(migrated)).toEqual(migrated)
  })

  it('adds a silent Signal lane and calibrated voice when migrating format v3 data', () => {
    const current = makeEmptyComposition()
    const legacy = structuredClone(current) as unknown as Record<string, unknown>
    const voices = legacy.voices as Record<string, unknown>
    delete voices.signal
    for (const pattern of legacy.patterns as Array<{ steps: Array<Record<string, unknown>> }>) {
      for (const step of pattern.steps) {
        delete step.signal
        delete step.signalLength
        delete step.signalTie
      }
    }
    legacy.formatVersion = 3
    const migrated = cloneComposition(legacy as unknown as Composition)
    expect(migrated.formatVersion).toBe(4)
    expect(migrated.voices.signal).toMatchObject({ volume: -15, cutoff: 4200, glide: 0.06 })
    expect(migrated.voices.signal.sends).toEqual({ fracture: 0.25, veil: 0.5, memory: 0.55, environment: 0.4 })
    expect(migrated.patterns.every((pattern) => pattern.steps.every((step) => step.signal === null && step.signalLength === 1 && !step.signalTie))).toBe(true)
  })
})
