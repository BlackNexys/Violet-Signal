import { beforeEach, describe, expect, it } from 'vitest'
import { serializeComposition } from '../dsl/serializer'
import { getActivePattern } from '../model/composition'
import { getScene } from '../model/scenes'
import type { StylePreserve } from '../model/styles'
import { useAppStore } from './store'

describe('shared composition state', () => {
  const replaceEverything: StylePreserve = { tempo: false, timing: false, harmony: false, patterns: false, arrangement: false, voices: false, effects: false }
  beforeEach(() => {
    useAppStore.getState().setPlaying(false)
    useAppStore.getState().loadScene('rain-behind-glass')
  })

  it('projects sequencer edits into the model and generated code', () => {
    const before = getActivePattern(useAppStore.getState().composition).steps[1].drum
    useAppStore.getState().toggleHit(1, 'drum')
    const after = useAppStore.getState()
    expect(getActivePattern(after.composition).steps[1].drum).toBe(!before)
    const pulseLine = after.code.split('\n').find((line) => line.trimStart().startsWith('pulse A:'))
    expect(pulseLine).toContain('02')
  })

  it('preserves the last valid composition after invalid code', () => {
    const lastValid = useAppStore.getState().composition
    const invalid = useAppStore.getState().code.replace(
      /^ {2}notes A:.*$/m,
      '  notes A: 17=C4',
    )
    useAppStore.getState().setCodeDraft(invalid)
    const state = useAppStore.getState()
    expect(state.composition).toBe(lastValid)
    expect(state.codeError?.message).toContain('outside this 16-step bar')
    expect(state.code).toBe(invalid)
  })

  it('stages valid code while playing and applies it at the next bar', () => {
    useAppStore.getState().setPlaying(true)
    const edited = serializeComposition({ ...getScene('rain-behind-glass'), bpm: 101 })
    useAppStore.getState().setCodeDraft(edited)
    expect(useAppStore.getState().composition.bpm).toBe(76)
    expect(useAppStore.getState().pendingComposition?.bpm).toBe(101)
    useAppStore.getState().applyPending('bar')
    expect(useAppStore.getState().composition.bpm).toBe(101)
    expect(useAppStore.getState().pendingComposition).toBeNull()
  })

  it('supports composition-level undo and redo', () => {
    useAppStore.getState().updateSound('memory', 0.73)
    expect(useAppStore.getState().composition.sound.memory).toBe(0.73)
    useAppStore.getState().undo()
    expect(useAppStore.getState().composition.sound.memory).toBe(0.42)
    useAppStore.getState().redo()
    expect(useAppStore.getState().composition.sound.memory).toBe(0.73)
  })

  it('assigns exact notes and length to the selected step', () => {
    useAppStore.getState().selectStep(5, 'notes')
    useAppStore.getState().assignNote('D4')
    useAppStore.getState().assignNote('F4')
    useAppStore.getState().setStepLength('notes', 3)
    const step = getActivePattern(useAppStore.getState().composition).steps[5]
    expect(step.notes).toEqual(['D4', 'F4'])
    expect(step.chordLength).toBe(3)
    expect(useAppStore.getState().code).toContain('06=D4+F4~3')
  })

  it('projects step expression into generated code', () => {
    useAppStore.getState().selectStep(4, 'drum')
    useAppStore.getState().setStepExpression('probability', 0.65)
    useAppStore.getState().setStepExpression('ratchets', 3)
    useAppStore.getState().setStepExpression('microShift', -0.08)
    const state = useAppStore.getState()
    const step = getActivePattern(state.composition).steps[4]
    expect(step).toMatchObject({ probability: 0.65, ratchets: 3, microShift: -0.08 })
    expect(state.code).toContain('chance A: 05=0.65')
    expect(state.code).toContain('ratchet A: 05=3')
    expect(state.code).toContain('shift A: 05=-0.08')
  })

  it('projects automation interpolation into the model and notation', () => {
    useAppStore.getState().setAutomationMode('veil', 'linear')
    const state = useAppStore.getState()
    expect(getActivePattern(state.composition).automationModes.veil).toBe('linear')
    expect(state.code).toContain('automate veil A linear:')
    useAppStore.getState().undo()
    expect(getActivePattern(useAppStore.getState().composition).automationModes.veil).toBe('hold')
  })

  it('projects independent Chord and Bass ties and clears them with their events', () => {
    useAppStore.getState().selectStep(0, 'notes')
    useAppStore.getState().setStepTie('notes', true)
    expect(getActivePattern(useAppStore.getState().composition).steps[0].chordTie).toBe(true)
    expect(useAppStore.getState().code).toMatch(/notes A: .*01=[^\s]+>/)

    useAppStore.getState().selectStep(0, 'bass')
    useAppStore.getState().setStepTie('bass', true)
    expect(getActivePattern(useAppStore.getState().composition).steps[0].bassTie).toBe(true)
    useAppStore.getState().clearSelectedLane()
    expect(getActivePattern(useAppStore.getState().composition).steps[0]).toMatchObject({ bass: null, bassTie: false })
  })

  it('applies a style as one undoable composition transformation', () => {
    useAppStore.getState().applyStyle('glitch', 1, replaceEverything, [{ id: 'ambient', amount: 0.2 }])
    const styled = useAppStore.getState()
    expect(styled.composition).toMatchObject({ world: 'glitch', meter: '7/8', stepCount: 14 })
    expect(styled.currentSceneId).toBe('custom')
    expect(styled.code).toContain('influences: ambient=0.2')
    useAppStore.getState().undo()
    expect(useAppStore.getState().composition.id).toBe('rain-behind-glass')
  })

  it('queues structural style changes safely during playback', () => {
    useAppStore.getState().setPlaying(true)
    useAppStore.getState().selectStep(15)
    useAppStore.getState().applyStyle('cinematic', 1, replaceEverything, [])
    expect(useAppStore.getState().composition.stepCount).toBe(16)
    expect(useAppStore.getState().pendingComposition?.stepCount).toBe(12)
    expect(useAppStore.getState().selectedStep).toBe(11)
    useAppStore.getState().applyPending('bar')
    expect(useAppStore.getState().composition).toMatchObject({ world: 'cinematic', meter: '6/8', stepCount: 12 })
  })

  it('copies, transforms, and arranges patterns independently', () => {
    useAppStore.getState().duplicateToNextPattern()
    expect(useAppStore.getState().composition.activePatternId).toBe('B')
    const before = useAppStore.getState().composition.patterns.find((pattern) => pattern.id === 'B')!.steps[0].notes
    useAppStore.getState().transposeActivePattern(1)
    const after = useAppStore.getState().composition.patterns.find((pattern) => pattern.id === 'B')!.steps[0].notes
    expect(after).not.toEqual(before)
    useAppStore.getState().clearArrangement()
    useAppStore.getState().addArrangementPattern('C')
    expect(useAppStore.getState().composition.arrangement.map((occurrence) => occurrence.pattern)).toEqual(['B', 'C'])
    useAppStore.getState().setArrangementTranspose(1, 12)
    useAppStore.getState().setArrangementRotation(1, 3)
    useAppStore.getState().toggleArrangementMute(1, 'pulse')
    useAppStore.getState().setArrangementLayer(1, 'chords', 'shadow')
    useAppStore.getState().setArrangementEffect(1, 'memory', 0.25)
    expect(useAppStore.getState().composition.arrangement[1]).toEqual({
      pattern: 'C', transpose: 12, rotate: 3, mute: ['pulse'], layers: { chords: 'shadow' }, effects: { memory: 0.25 },
    })
    expect(useAppStore.getState().code).toContain('C[transpose=12,rotate=3,mute=pulse,layers=chords:shadow,effects=memory:0.25]')
  })

  it('honors the selected live-code quantization boundary', () => {
    useAppStore.getState().setPlaying(true)
    useAppStore.getState().setApplyQuantization('beat')
    const edited = serializeComposition({ ...getScene('rain-behind-glass'), bpm: 110 })
    useAppStore.getState().setCodeDraft(edited)
    expect(useAppStore.getState().applyPending('step').bpm).toBe(76)
    expect(useAppStore.getState().applyPending('beat').bpm).toBe(110)
  })

  it('applies layered patches, marks manual edits custom, and supports undo', () => {
    useAppStore.getState().applyInstrumentPatch('chords', 'veil-archive/glass-choir@1')
    expect(useAppStore.getState().composition.voices.chords).toMatchObject({ patchId: 'veil-archive/glass-choir@1' })
    expect(useAppStore.getState().composition.voices.chords.layers.shadow.enabled).toBe(true)
    useAppStore.getState().updateVoiceLayer('chords', 'shadow', 'character', 0.61)
    expect(useAppStore.getState().composition.voices.chords.patchId).toBeNull()
    expect(useAppStore.getState().code).toContain('layer chords shadow: on')
    useAppStore.getState().undo()
    expect(useAppStore.getState().composition.voices.chords.patchId).toBe('veil-archive/glass-choir@1')
  })

  it('queues a patch at the selected musical boundary during playback', () => {
    useAppStore.getState().setPlaying(true)
    useAppStore.getState().applyInstrumentPatch('bass', 'veil-archive/undertow@1')
    expect(useAppStore.getState().composition.voices.bass.patchId).toBeNull()
    expect(useAppStore.getState().pendingComposition?.voices.bass.patchId).toBe('veil-archive/undertow@1')
    useAppStore.getState().applyPending('bar')
    expect(useAppStore.getState().composition.voices.bass.patchId).toBe('veil-archive/undertow@1')
  })
})
