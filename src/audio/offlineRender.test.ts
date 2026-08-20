import { describe, expect, it } from 'vitest'
import { getPattern, makeEmptyComposition, resizeComposition } from '../model/composition'
import { applyInstrumentPatch } from '../model/instrumentPacks'
import { renderCompositionToWav } from './offlineRender'

describe('layered offline rendering', () => {
  it.skipIf(typeof globalThis.OfflineAudioContext === 'undefined')('renders an AM/FM layered patch to a stereo WAV', async () => {
    let composition = resizeComposition(makeEmptyComposition(), 8)
    composition = applyInstrumentPatch(composition, 'chords', 'veil-archive/glass-choir@1')
    composition.bpm = 220
    composition.arrangement = ['A']
    getPattern(composition, 'A').steps[0].notes = ['C4', 'Eb4', 'G4']
    const blob = await renderCompositionToWav(composition)
    expect(blob.type).toBe('audio/wav')
    expect(blob.size).toBeGreaterThan(44)
  }, 20_000)
})
