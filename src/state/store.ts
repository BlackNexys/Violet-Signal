import { create } from 'zustand'
import { parseComposition, type FriendlyParseError } from '../dsl/parser'
import { serializeComposition } from '../dsl/serializer'
import {
  PATTERN_IDS,
  SCALE_MODES,
  SCALE_ROOTS,
  VOICE_IDS,
  clamp,
  cloneComposition,
  clonePattern,
  getActivePattern,
  getPattern,
  isEngineCompatible,
  makeArrangementOccurrence,
  noteToMidi,
  rotatePattern,
  transposePattern,
  type ApplyQuantization,
  type ArrangementLayerSelection,
  type AutomationTarget,
  type Composition,
  type NoteLane,
  type OccurrenceEffectTarget,
  type PatternId,
  type ScaleMode,
  type SoundSettings,
  type Step,
  type StepLane,
  type VoiceId,
  type LayerSlot,
  type VoiceLayerSettings,
  type VoiceSettings,
} from '../model/composition'
import { applyInstrumentPatch as createPatchedComposition } from '../model/instrumentPacks'
import { getScene, scenes } from '../model/scenes'
import { applyStyle as createStyledComposition, type StyleInfluence, type StylePreserve } from '../model/styles'

type Boundary = 'step' | 'beat' | 'bar'

interface AppState {
  composition: Composition
  code: string
  codeError: FriendlyParseError | null
  pendingComposition: Composition | null
  pendingCode: string | null
  currentSceneId: string
  history: Composition[]
  future: Composition[]
  isPlaying: boolean
  audioReady: boolean
  activeStep: number
  playingPatternId: PatternId
  arrangementIndex: number
  selectedStep: number
  selectedLane: StepLane
  selectedVoice: VoiceId
  applyQuantization: ApplyQuantization
  recordArmed: boolean
  exhaustion: number
  performancePressure: boolean
  memoryFreeze: boolean
  setAudioReady: (ready: boolean) => void
  setPlaying: (playing: boolean) => void
  setPosition: (step: number, pattern: PatternId, arrangementIndex: number) => void
  setExhaustion: (amount: number) => void
  setPerformancePressure: (active: boolean) => void
  setMemoryFreeze: (active: boolean) => void
  loadScene: (id: string) => void
  loadComposition: (composition: Composition, sceneId?: string) => void
  resetScene: () => void
  renameComposition: (name: string) => void
  updateSound: <K extends keyof SoundSettings>(key: K, value: SoundSettings[K]) => void
  updateVoice: <K extends Exclude<keyof VoiceSettings, 'patchId' | 'layers'>>(voice: VoiceId, key: K, value: VoiceSettings[K]) => void
  updateVoiceLayer: <K extends keyof VoiceLayerSettings>(voice: VoiceId, slot: LayerSlot, key: K, value: VoiceLayerSettings[K]) => void
  applyInstrumentPatch: (voice: VoiceId, patchId: string) => void
  updateRoot: (key: 'bpm' | 'masterVolume' | 'scaleLock' | 'scaleRoot' | 'scaleMode', value: number | boolean | string) => void
  selectVoice: (voice: VoiceId) => void
  selectStep: (step: number, lane?: StepLane) => void
  assignNote: (note: string) => void
  setChord: (notes: string[]) => void
  clearSelectedLane: () => void
  toggleHit: (step: number, lane: 'drum' | 'texture') => void
  setStepLength: (lane: NoteLane, length: number) => void
  cycleVelocity: (step: number) => void
  setStepExpression: (key: 'probability' | 'ratchets' | 'microShift', value: number) => void
  selectPattern: (id: PatternId) => void
  duplicateToNextPattern: () => void
  rotateActivePattern: (offset: number) => void
  transposeActivePattern: (semitones: number) => void
  addArrangementPattern: (id: PatternId) => void
  removeArrangementPattern: (index: number) => void
  clearArrangement: () => void
  setArrangementTranspose: (index: number, semitones: number) => void
  setArrangementRotation: (index: number, steps: number) => void
  toggleArrangementMute: (index: number, voice: VoiceId) => void
  setArrangementLayer: (index: number, voice: VoiceId, selection: ArrangementLayerSelection) => void
  setArrangementEffect: (index: number, target: OccurrenceEffectTarget, value: number) => void
  setAutomationPoint: (target: AutomationTarget, step: number, value: number | null) => void
  applyStyle: (styleId: string, strength: number, preserve: StylePreserve, influences: StyleInfluence[]) => void
  setCodeDraft: (code: string) => void
  formatCode: () => void
  setApplyQuantization: (quantization: ApplyQuantization) => void
  applyPending: (boundary: Boundary) => Composition
  setRecordArmed: (armed: boolean) => void
  undo: () => void
  redo: () => void
}

const initialComposition = getScene(scenes[0].id)
const MAX_HISTORY = 80

function sameComposition(left: Composition, right: Composition) { return JSON.stringify(left) === JSON.stringify(right) }
function historyWith(history: Composition[], composition: Composition) { return [...history, cloneComposition(composition)].slice(-MAX_HISTORY) }

export const useAppStore = create<AppState>((set, get) => {
  const commitMutation = (mutate: (draft: Composition) => void) => {
    const current = get().composition
    const next = cloneComposition(current)
    mutate(next)
    if (sameComposition(current, next)) return
    set({
      composition: next,
      code: serializeComposition(next),
      codeError: null,
      pendingComposition: null,
      pendingCode: null,
      history: historyWith(get().history, current),
      future: [],
    })
  }

  const selectedTarget = (draft: Composition) => {
    const state = get()
    const patternId = state.recordArmed && state.isPlaying ? state.playingPatternId : draft.activePatternId
    const stepIndex = state.recordArmed && state.isPlaying && state.activeStep >= 0 ? state.activeStep : state.selectedStep
    return { pattern: getPattern(draft, patternId), stepIndex }
  }

  return {
    composition: initialComposition,
    code: serializeComposition(initialComposition),
    codeError: null,
    pendingComposition: null,
    pendingCode: null,
    currentSceneId: initialComposition.id,
    history: [],
    future: [],
    isPlaying: false,
    audioReady: false,
    activeStep: -1,
    playingPatternId: 'A',
    arrangementIndex: 0,
    selectedStep: 0,
    selectedLane: 'notes',
    selectedVoice: 'chords',
    applyQuantization: 'bar',
    recordArmed: false,
    exhaustion: 0,
    performancePressure: false,
    memoryFreeze: false,
    setAudioReady: (audioReady) => set({ audioReady }),
    setPlaying: (isPlaying) => set({ isPlaying }),
    setPosition: (activeStep, playingPatternId, arrangementIndex) => set({ activeStep, playingPatternId, arrangementIndex }),
    setExhaustion: (exhaustion) => set({ exhaustion }),
    setPerformancePressure: (performancePressure) => set({ performancePressure }),
    setMemoryFreeze: (memoryFreeze) => set({ memoryFreeze }),
    loadScene: (id) => {
      const next = getScene(id)
      set({
        composition: next,
        code: serializeComposition(next),
        codeError: null,
        pendingComposition: null,
        pendingCode: null,
        currentSceneId: next.id,
        history: [],
        future: [],
        activeStep: -1,
        playingPatternId: next.arrangement[0]?.pattern ?? 'A',
        arrangementIndex: 0,
        selectedStep: 0,
        exhaustion: 0,
      })
    },
    loadComposition: (composition, sceneId = 'custom') => {
      const next = cloneComposition(composition)
      set({ composition: next, code: serializeComposition(next), codeError: null, pendingComposition: null, pendingCode: null, currentSceneId: sceneId, history: [], future: [], selectedStep: 0 })
    },
    resetScene: () => get().loadScene(get().currentSceneId === 'custom' ? scenes[0].id : get().currentSceneId),
    renameComposition: (name) => commitMutation((draft) => { draft.name = name.trim() || draft.name }),
    updateSound: (key, value) => commitMutation((draft) => { draft.sound[key] = value }),
    updateVoice: (voice, key, value) => commitMutation((draft) => {
      ;(draft.voices[voice] as unknown as Record<string, unknown>)[key] = value
      if (key !== 'mute' && key !== 'solo') draft.voices[voice].patchId = null
    }),
    updateVoiceLayer: (voice, slot, key, value) => commitMutation((draft) => {
      if (key === 'engine' && !isEngineCompatible(voice, value as VoiceLayerSettings['engine'])) return
      ;(draft.voices[voice].layers[slot] as unknown as Record<string, unknown>)[key] = value
      if (slot === 'primary') draft.voices[voice].layers.primary.enabled = true
      draft.voices[voice].patchId = null
    }),
    applyInstrumentPatch: (voice, patchId) => {
      const current = get().composition
      const next = createPatchedComposition(current, voice, patchId)
      if (sameComposition(current, next)) return
      const nextCode = serializeComposition(next)
      if (get().isPlaying) {
        set({ code: nextCode, codeError: null, pendingComposition: next, pendingCode: nextCode, currentSceneId: 'custom' })
        return
      }
      set({ composition: next, code: nextCode, codeError: null, pendingComposition: null, pendingCode: null, currentSceneId: 'custom', history: historyWith(get().history, current), future: [] })
    },
    updateRoot: (key, value) => commitMutation((draft) => {
      if (key === 'bpm' && typeof value === 'number') draft.bpm = value
      if (key === 'masterVolume' && typeof value === 'number') draft.masterVolume = value
      if (key === 'scaleLock' && typeof value === 'boolean') draft.scaleLock = value
      if (key === 'scaleRoot' && typeof value === 'string' && SCALE_ROOTS.includes(value as (typeof SCALE_ROOTS)[number])) draft.scaleRoot = value
      if (key === 'scaleMode' && typeof value === 'string' && SCALE_MODES.includes(value as ScaleMode)) draft.scaleMode = value as ScaleMode
    }),
    selectVoice: (selectedVoice) => set({ selectedVoice }),
    selectStep: (selectedStep, selectedLane = get().selectedLane) => set({ selectedStep, selectedLane }),
    assignNote: (note) => commitMutation((draft) => {
      const { pattern, stepIndex } = selectedTarget(draft)
      const step = pattern.steps[stepIndex]
      if (get().selectedLane === 'bass') {
        const bassNote = note.replace(/-?\d$/, '2')
        step.bass = step.bass === bassNote ? null : bassNote
      } else {
        step.notes = step.notes.includes(note) ? step.notes.filter((current) => current !== note) : [...step.notes, note]
        step.notes.sort((left, right) => (noteToMidi(left) ?? 0) - (noteToMidi(right) ?? 0))
      }
    }),
    setChord: (notes) => commitMutation((draft) => {
      const { pattern, stepIndex } = selectedTarget(draft)
      pattern.steps[stepIndex].notes = [...notes]
    }),
    clearSelectedLane: () => commitMutation((draft) => {
      const { pattern, stepIndex } = selectedTarget(draft)
      const step = pattern.steps[stepIndex]
      if (get().selectedLane === 'notes') step.notes = []
      if (get().selectedLane === 'bass') step.bass = null
      if (get().selectedLane === 'drum') step.drum = false
      if (get().selectedLane === 'texture') step.texture = false
    }),
    toggleHit: (stepIndex, lane) => commitMutation((draft) => {
      const step = getActivePattern(draft).steps[stepIndex]
      step[lane] = !step[lane]
    }),
    setStepLength: (lane, length) => commitMutation((draft) => {
      const { pattern, stepIndex } = selectedTarget(draft)
      pattern.steps[stepIndex][lane === 'notes' ? 'chordLength' : 'bassLength'] = clamp(Math.round(length), 1, 8)
    }),
    cycleVelocity: (stepIndex) => commitMutation((draft) => {
      const step = getActivePattern(draft).steps[stepIndex]
      step.velocity = step.velocity < 0.65 ? 0.75 : step.velocity < 0.85 ? 0.95 : 0.52
    }),
    setStepExpression: (key, value) => commitMutation((draft) => {
      const { pattern, stepIndex } = selectedTarget(draft)
      const step = pattern.steps[stepIndex]
      const bounds: Record<typeof key, [number, number]> = { probability: [0, 1], ratchets: [1, 4], microShift: [-0.45, 0.45] }
      step[key] = key === 'ratchets' ? Math.round(clamp(value, ...bounds[key])) : clamp(value, ...bounds[key]) as Step[typeof key]
    }),
    selectPattern: (activePatternId) => commitMutation((draft) => { draft.activePatternId = activePatternId }),
    duplicateToNextPattern: () => commitMutation((draft) => {
      const currentIndex = PATTERN_IDS.indexOf(draft.activePatternId)
      const targetId = PATTERN_IDS[(currentIndex + 1) % PATTERN_IDS.length]
      const copy = clonePattern(getActivePattern(draft))
      copy.id = targetId
      copy.name = `Pattern ${targetId}`
      draft.patterns = draft.patterns.map((pattern) => pattern.id === targetId ? copy : pattern)
      draft.activePatternId = targetId
    }),
    rotateActivePattern: (offset) => commitMutation((draft) => {
      const rotated = rotatePattern(getActivePattern(draft), offset)
      draft.patterns = draft.patterns.map((pattern) => pattern.id === rotated.id ? rotated : pattern)
    }),
    transposeActivePattern: (semitones) => commitMutation((draft) => {
      const transposed = transposePattern(getActivePattern(draft), semitones)
      draft.patterns = draft.patterns.map((pattern) => pattern.id === transposed.id ? transposed : pattern)
    }),
    addArrangementPattern: (id) => commitMutation((draft) => {
      if (draft.arrangement.length < 16) draft.arrangement.push(makeArrangementOccurrence(id))
    }),
    removeArrangementPattern: (index) => commitMutation((draft) => {
      if (draft.arrangement.length > 1) draft.arrangement.splice(index, 1)
    }),
    clearArrangement: () => commitMutation((draft) => { draft.arrangement = [makeArrangementOccurrence(draft.activePatternId)] }),
    setArrangementTranspose: (index, semitones) => commitMutation((draft) => {
      const occurrence = draft.arrangement[index]
      if (occurrence) occurrence.transpose = Math.round(clamp(semitones, -24, 24))
    }),
    setArrangementRotation: (index, steps) => commitMutation((draft) => {
      const occurrence = draft.arrangement[index]
      if (occurrence) occurrence.rotate = Math.round(clamp(steps, -63, 63))
    }),
    toggleArrangementMute: (index, voice) => commitMutation((draft) => {
      const occurrence = draft.arrangement[index]
      if (!occurrence) return
      const muted = new Set(occurrence.mute)
      if (muted.has(voice)) muted.delete(voice)
      else muted.add(voice)
      occurrence.mute = VOICE_IDS.filter((current) => muted.has(current))
    }),
    setArrangementLayer: (index, voice, selection) => commitMutation((draft) => {
      const occurrence = draft.arrangement[index]
      if (!occurrence) return
      if (selection === 'all') delete occurrence.layers[voice]
      else occurrence.layers[voice] = selection
    }),
    setArrangementEffect: (index, target, value) => commitMutation((draft) => {
      const occurrence = draft.arrangement[index]
      if (!occurrence) return
      const normalized = target === 'mask' ? clamp(value, 0.25, 4) : clamp(value, -1, 1)
      if ((target === 'mask' && normalized === 1) || (target !== 'mask' && normalized === 0)) delete occurrence.effects[target]
      else occurrence.effects[target] = normalized
    }),
    setAutomationPoint: (target, stepIndex, value) => commitMutation((draft) => {
      getActivePattern(draft).automation[target][stepIndex] = value
    }),
    applyStyle: (styleId, strength, preserve, influences) => {
      const current = get().composition
      const next = createStyledComposition(current, styleId, strength, preserve, influences)
      const nextCode = serializeComposition(next)
      if (get().isPlaying) {
        set({ code: nextCode, codeError: null, pendingComposition: next, pendingCode: nextCode, currentSceneId: 'custom', selectedStep: Math.min(get().selectedStep, next.stepCount - 1) })
        return
      }
      set({ composition: next, code: nextCode, codeError: null, pendingComposition: null, pendingCode: null, currentSceneId: 'custom', history: historyWith(get().history, current), future: [], selectedStep: Math.min(get().selectedStep, next.stepCount - 1) })
    },
    setCodeDraft: (code) => {
      const result = parseComposition(code)
      if (!result.ok) { set({ code, codeError: result.error, pendingComposition: null, pendingCode: null }); return }
      if (get().isPlaying) { set({ code, codeError: null, pendingComposition: result.composition, pendingCode: code }); return }
      const current = get().composition
      set({ composition: result.composition, code, codeError: null, pendingComposition: null, pendingCode: null, history: sameComposition(current, result.composition) ? get().history : historyWith(get().history, current), future: [] })
    },
    formatCode: () => set({ code: serializeComposition(get().pendingComposition ?? get().composition), codeError: null }),
    setApplyQuantization: (applyQuantization) => set({ applyQuantization }),
    applyPending: (boundary) => {
      const pending = get().pendingComposition
      const quantization = get().applyQuantization
      const eligible = quantization === 'step' || (quantization === 'beat' && boundary !== 'step') || (quantization === 'bar' && boundary === 'bar')
      if (!pending || !eligible) return get().composition
      const current = get().composition
      set({ composition: pending, code: get().pendingCode ?? serializeComposition(pending), pendingComposition: null, pendingCode: null, history: historyWith(get().history, current), future: [] })
      return pending
    },
    setRecordArmed: (recordArmed) => set({ recordArmed }),
    undo: () => {
      const previous = get().history.at(-1)
      if (!previous) return
      const current = get().composition
      set({ composition: cloneComposition(previous), code: serializeComposition(previous), codeError: null, pendingComposition: null, pendingCode: null, history: get().history.slice(0, -1), future: [cloneComposition(current), ...get().future].slice(0, MAX_HISTORY) })
    },
    redo: () => {
      const [next, ...rest] = get().future
      if (!next) return
      const current = get().composition
      set({ composition: cloneComposition(next), code: serializeComposition(next), codeError: null, pendingComposition: null, pendingCode: null, history: historyWith(get().history, current), future: rest })
    },
  }
})
