import { beforeEach, describe, expect, it } from 'vitest'
import { serializeComposition } from '../dsl/serializer'
import { getActivePattern } from '../model/composition'
import { getScene } from '../model/scenes'
import { useAppStore } from './store'

describe('shared composition state', () => {
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
