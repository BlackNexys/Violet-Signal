import { useState } from 'react'
import {
  ArrowLeftFromLine,
  ArrowRightFromLine,
  Copy,
  Grid3X3,
  Minus,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
} from 'lucide-react'
import {
  PATTERN_IDS,
  chordSuggestions,
  getActivePattern,
  type AutomationTarget,
  type NoteLane,
  type StepLane,
} from '../model/composition'
import { useAppStore } from '../state/store'

const shortNotes = (notes: string[]) => notes.length ? `${notes[0].replace(/-?\d/, '')}${notes.length > 1 ? `+${notes.length - 1}` : ''}` : '·'
const subdivisions = ['1', 'e', '&', 'a']

const automationBounds: Record<AutomationTarget, { min: number; max: number; step: number; label: string }> = {
  mask: { min: 80, max: 12000, step: 10, label: 'Filter cutoff' },
  memory: { min: 0, max: 1, step: 0.01, label: 'Delay amount' },
  veil: { min: 0, max: 1, step: 0.01, label: 'Chorus width' },
  fracture: { min: 0, max: 1, step: 0.01, label: 'Bit reduction' },
  ghost: { min: 0, max: 1, step: 0.01, label: 'Probability' },
  overclock: { min: 0, max: 1, step: 0.01, label: 'Performance pressure' },
}

export function SequencerPanel() {
  const [automationTarget, setAutomationTarget] = useState<AutomationTarget>('mask')
  const composition = useAppStore((state) => state.composition)
  const activeStep = useAppStore((state) => state.activeStep)
  const playingPatternId = useAppStore((state) => state.playingPatternId)
  const selectedStep = useAppStore((state) => state.selectedStep)
  const selectedLane = useAppStore((state) => state.selectedLane)
  const arrangementIndex = useAppStore((state) => state.arrangementIndex)
  const selectStep = useAppStore((state) => state.selectStep)
  const toggleHit = useAppStore((state) => state.toggleHit)
  const cycleVelocity = useAppStore((state) => state.cycleVelocity)
  const setChord = useAppStore((state) => state.setChord)
  const clearSelectedLane = useAppStore((state) => state.clearSelectedLane)
  const setStepLength = useAppStore((state) => state.setStepLength)
  const selectPattern = useAppStore((state) => state.selectPattern)
  const duplicateToNextPattern = useAppStore((state) => state.duplicateToNextPattern)
  const rotateActivePattern = useAppStore((state) => state.rotateActivePattern)
  const transposeActivePattern = useAppStore((state) => state.transposeActivePattern)
  const addArrangementPattern = useAppStore((state) => state.addArrangementPattern)
  const removeArrangementPattern = useAppStore((state) => state.removeArrangementPattern)
  const clearArrangement = useAppStore((state) => state.clearArrangement)
  const setAutomationPoint = useAppStore((state) => state.setAutomationPoint)
  const pattern = getActivePattern(composition)
  const selected = pattern.steps[selectedStep]
  const suggestions = chordSuggestions(composition)
  const automation = pattern.automation[automationTarget]
  const automationConfig = automationBounds[automationTarget]
  const fallbackAutomation = automationTarget === 'mask' ? composition.voices.chords.cutoff : composition.sound[automationTarget]

  const selectLane = (step: number, lane: StepLane) => selectStep(step, lane)
  const toggleAndSelect = (step: number, lane: 'drum' | 'texture') => {
    selectStep(step, lane)
    toggleHit(step, lane)
  }

  return (
    <section className="workspace-panel sequence-panel" aria-labelledby="sequence-heading">
      <div className="panel-heading">
        <div><span className="eyebrow">Four patterns · one arrangement</span><h2 id="sequence-heading">Sequence</h2></div>
        <Grid3X3 size={19} aria-hidden="true" />
      </div>

      <div className="pattern-toolbar">
        <div className="pattern-tabs" aria-label="Editable patterns">
          {PATTERN_IDS.map((id) => (
            <button type="button" key={id} className={composition.activePatternId === id ? 'is-active' : ''} onClick={() => selectPattern(id)}>
              {id}{playingPatternId === id && <i title="Currently sounding" />}
            </button>
          ))}
        </div>
        <div className="pattern-actions">
          <button type="button" title="Duplicate into the next pattern" onClick={duplicateToNextPattern}><Copy size={13} /> Copy next</button>
          <button type="button" title="Rotate one step left" onClick={() => rotateActivePattern(-1)}><ArrowLeftFromLine size={13} /></button>
          <button type="button" title="Rotate one step right" onClick={() => rotateActivePattern(1)}><ArrowRightFromLine size={13} /></button>
          <button type="button" title="Transpose down one semitone" onClick={() => transposeActivePattern(-1)}><Minus size={13} /></button>
          <button type="button" title="Transpose up one semitone" onClick={() => transposeActivePattern(1)}><Plus size={13} /></button>
        </div>
      </div>

      <div className="arrangement-strip">
        <span>Song</span>
        <div className="arrangement-cells">
          {composition.arrangement.map((id, index) => (
            <button type="button" key={`${id}-${index}`} className={index === arrangementIndex ? 'is-playing' : ''} title="Remove this bar" onClick={() => removeArrangementPattern(index)}>{id}</button>
          ))}
        </div>
        <div className="arrangement-add" aria-label="Append pattern to arrangement">
          {PATTERN_IDS.map((id) => <button type="button" key={id} disabled={composition.arrangement.length >= 16} onClick={() => addArrangementPattern(id)}>+{id}</button>)}
        </div>
        <button type="button" className="arrangement-clear" title="Start arrangement with the active pattern" onClick={clearArrangement}><RotateCcw size={12} /></button>
      </div>

      <div className="sequencer-scroll" tabIndex={0} aria-label="16-step sequencer; four subdivisions per beat">
        <div className="beat-ruler" aria-hidden="true">
          <span />
          {[1, 2, 3, 4].map((beat) => <strong key={beat}>Beat {beat}</strong>)}
        </div>
        <div className="sequencer-grid sequencer-grid--expanded">
          <div className="lane-label lane-label--header">Step</div>
          {pattern.steps.map((_, index) => (
            <div key={`step-${index}`} className={`step-number${activeStep === index && playingPatternId === pattern.id ? ' is-current' : ''}${selectedStep === index ? ' is-selected' : ''}`}>
              <span>{subdivisions[index % 4]}</span><small>{String(index + 1).padStart(2, '0')}</small><i />
            </div>
          ))}

          <div className="lane-label"><span>Chords</span><small>Poly voice</small></div>
          {pattern.steps.map((step, index) => (
            <button type="button" key={`notes-${index}`}
              className={`step-cell note-cell${step.notes.length ? ' is-active' : ''}${activeStep === index && playingPatternId === pattern.id ? ' is-current' : ''}${selectedStep === index && selectedLane === 'notes' ? ' is-selected' : ''}`}
              aria-label={`Step ${index + 1} chord: ${step.notes.join(', ') || 'silent'}`} aria-pressed={selectedStep === index && selectedLane === 'notes'}
              onClick={() => selectLane(index, 'notes')}>
              <span>{shortNotes(step.notes)}</span>{step.notes.length > 0 && step.chordLength > 1 && <small>{step.chordLength}</small>}
            </button>
          ))}

          <div className="lane-label"><span>Bass</span><small>Mono voice</small></div>
          {pattern.steps.map((step, index) => (
            <button type="button" key={`bass-${index}`}
              className={`step-cell bass-cell${step.bass ? ' is-active' : ''}${activeStep === index && playingPatternId === pattern.id ? ' is-current' : ''}${selectedStep === index && selectedLane === 'bass' ? ' is-selected' : ''}`}
              aria-label={`Step ${index + 1} bass: ${step.bass ?? 'silent'}`} aria-pressed={selectedStep === index && selectedLane === 'bass'}
              onClick={() => selectLane(index, 'bass')}>
              <span>{step.bass?.replace(/-?\d/, '') ?? '·'}</span>{step.bass && step.bassLength > 1 && <small>{step.bassLength}</small>}
            </button>
          ))}

          <div className="lane-label"><span>Pulse</span><small>Percussion</small></div>
          {pattern.steps.map((step, index) => (
            <button type="button" key={`drum-${index}`}
              className={`step-cell drum-cell${step.drum ? ' is-active' : ''}${activeStep === index && playingPatternId === pattern.id ? ' is-current' : ''}${selectedStep === index && selectedLane === 'drum' ? ' is-selected' : ''}`}
              aria-label={`Step ${index + 1} percussion: ${step.drum ? 'hit' : 'silent'}`} aria-pressed={step.drum}
              onClick={() => toggleAndSelect(index, 'drum')}><i /></button>
          ))}

          <div className="lane-label"><span>Texture</span><small>Noise voice</small></div>
          {pattern.steps.map((step, index) => (
            <button type="button" key={`texture-${index}`}
              className={`step-cell texture-cell${step.texture ? ' is-active' : ''}${activeStep === index && playingPatternId === pattern.id ? ' is-current' : ''}${selectedStep === index && selectedLane === 'texture' ? ' is-selected' : ''}`}
              aria-label={`Step ${index + 1} texture: ${step.texture ? 'active' : 'silent'}`} aria-pressed={step.texture}
              onClick={() => toggleAndSelect(index, 'texture')}><Sparkles size={10} /></button>
          ))}

          <div className="lane-label"><span>Body</span><small>Velocity</small></div>
          {pattern.steps.map((step, index) => (
            <button type="button" key={`velocity-${index}`} className={`velocity-cell${activeStep === index && playingPatternId === pattern.id ? ' is-current' : ''}`}
              aria-label={`Step ${index + 1} emphasis ${Math.round(step.velocity * 100)} percent; click to cycle`} onClick={() => cycleVelocity(index)}>
              <span style={{ '--velocity': step.velocity } as React.CSSProperties} />
            </button>
          ))}
        </div>
      </div>

      <div className="step-inspector">
        <div className="step-inspector__heading">
          <div><span className="eyebrow">Selected location</span><strong>Beat {Math.floor(selectedStep / 4) + 1} · {subdivisions[selectedStep % 4]} <small>step {String(selectedStep + 1).padStart(2, '0')}</small></strong></div>
          <button type="button" className="clear-step" onClick={clearSelectedLane}><Trash2 size={12} /> Clear {selectedLane}</button>
        </div>
        <div className="lane-picker" aria-label="Step lane">
          {(['notes', 'bass', 'drum', 'texture'] as StepLane[]).map((lane) => <button type="button" key={lane} className={selectedLane === lane ? 'is-active' : ''} onClick={() => selectStep(selectedStep, lane)}>{lane === 'notes' ? 'Chord' : lane === 'drum' ? 'Pulse' : lane}</button>)}
        </div>
        {selectedLane === 'notes' && (
          <div className="note-assignment">
            <div className="note-chips">{selected.notes.length ? selected.notes.map((note) => <button type="button" key={note} onClick={() => useAppStore.getState().assignNote(note)}>{note} ×</button>) : <span>No chord yet—use a suggestion or the touch keys.</span>}</div>
            <div className="chord-suggestions">{suggestions.map((chord) => <button type="button" key={chord.name} title={chord.notes.join(' ')} onClick={() => setChord(chord.notes)}>{chord.name}</button>)}</div>
          </div>
        )}
        {selectedLane === 'bass' && <div className="note-chips">{selected.bass ? <button type="button" onClick={clearSelectedLane}>{selected.bass} ×</button> : <span>No bass note—use the touch keys.</span>}</div>}
        {(selectedLane === 'notes' || selectedLane === 'bass') && (
          <label className="length-control">Length <select value={selectedLane === 'notes' ? selected.chordLength : selected.bassLength} onChange={(event) => setStepLength(selectedLane as NoteLane, Number(event.target.value))}>{[1, 2, 3, 4, 8].map((length) => <option key={length} value={length}>{length} step{length > 1 ? 's' : ''}</option>)}</select></label>
        )}
      </div>

      <div className="automation-editor">
        <div className="automation-heading">
          <span>Automation</span>
          <select value={automationTarget} onChange={(event) => setAutomationTarget(event.target.value as AutomationTarget)}>
            {(Object.keys(automationBounds) as AutomationTarget[]).map((target) => <option key={target} value={target}>{target} · {automationBounds[target].label}</option>)}
          </select>
          <button type="button" disabled={automation[selectedStep] === null} onClick={() => setAutomationPoint(automationTarget, selectedStep, null)}>Clear point</button>
        </div>
        <div className="automation-lane">
          {automation.map((value, index) => (
            <button type="button" key={index} className={`${value !== null ? 'has-point' : ''}${selectedStep === index ? ' is-selected' : ''}`} onClick={() => { selectStep(index); if (value === null) setAutomationPoint(automationTarget, index, fallbackAutomation) }} aria-label={`${automationTarget} step ${index + 1}: ${value ?? 'no point'}`}>
              <i style={{ '--automation': value === null ? 0 : (value - automationConfig.min) / (automationConfig.max - automationConfig.min) } as React.CSSProperties} />
            </button>
          ))}
        </div>
        <input type="range" min={automationConfig.min} max={automationConfig.max} step={automationConfig.step} value={automation[selectedStep] ?? fallbackAutomation} aria-label={`${automationTarget} at selected step`} onChange={(event) => setAutomationPoint(automationTarget, selectedStep, Number(event.target.value))} />
      </div>
    </section>
  )
}
