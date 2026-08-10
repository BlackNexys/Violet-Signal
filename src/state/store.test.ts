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
    expect(useAppStore.getState().composition.arrangement).toEqual(['B', 'C'])
  })

  it('honors the selected live-code quantization boundary', () => {
    useAppStore.getState().setPlaying(true)
    useAppStore.getState().setApplyQuantization('beat')
    const edited = serializeComposition({ ...getScene('rain-behind-glass'), bpm: 110 })
    useAppStore.getState().setCodeDraft(edited)
    expect(useAppStore.getState().applyPending('step').bpm).toBe(76)
    expect(useAppStore.getState().applyPending('beat').bpm).toBe(110)
  })
})
