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
  VOICE_IDS,
  chordSuggestions,
  getActivePattern,
  stepsPerBeat,
  type AutomationTarget,
  type ArrangementLayerSelection,
  type NoteLane,
  type OccurrenceEffectTarget,
  type StepLane,
} from '../model/composition'
import { arrangementOccurrenceDescription, arrangementOccurrenceLabel } from '../model/arrangement'
import { resolveAutomationValue } from '../model/automation'
import { useAppStore } from '../state/store'

const shortNotes = (notes: string[]) => notes.length ? `${notes[0].replace(/-?\d/, '')}${notes.length > 1 ? `+${notes.length - 1}` : ''}` : '·'
const automationBounds: Record<AutomationTarget, { min: number; max: number; step: number; label: string }> = {
  mask: { min: 80, max: 12000, step: 10, label: 'Filter cutoff' },
  memory: { min: 0, max: 1, step: 0.01, label: 'Delay amount' },
  veil: { min: 0, max: 1, step: 0.01, label: 'Chorus width' },
  fracture: { min: 0, max: 1, step: 0.01, label: 'Bit reduction' },
  ghost: { min: 0, max: 1, step: 0.01, label: 'Probability' },
  overclock: { min: 0, max: 1, step: 0.01, label: 'Performance pressure' },
}
const occurrenceEffectBounds: Record<OccurrenceEffectTarget, { min: number; max: number; step: number; neutral: number; label: string }> = {
  mask: { min: 0.25, max: 4, step: 0.05, neutral: 1, label: 'Mask multiplier' },
  memory: { min: -1, max: 1, step: 0.01, neutral: 0, label: 'Memory offset' },
  veil: { min: -1, max: 1, step: 0.01, neutral: 0, label: 'Veil offset' },
  fracture: { min: -1, max: 1, step: 0.01, neutral: 0, label: 'Fracture offset' },
  ghost: { min: -1, max: 1, step: 0.01, neutral: 0, label: 'Ghost offset' },
  overclock: { min: -1, max: 1, step: 0.01, neutral: 0, label: 'Overclock offset' },
}

export function SequencerPanel() {
  const [automationTarget, setAutomationTarget] = useState<AutomationTarget>('mask')
  const [selectedOccurrenceIndex, setSelectedOccurrenceIndex] = useState(0)
  const [occurrenceEffectTarget, setOccurrenceEffectTarget] = useState<OccurrenceEffectTarget>('memory')
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
  const setStepTie = useAppStore((state) => state.setStepTie)
  const selectPattern = useAppStore((state) => state.selectPattern)
  const duplicateToNextPattern = useAppStore((state) => state.duplicateToNextPattern)
  const rotateActivePattern = useAppStore((state) => state.rotateActivePattern)
  const transposeActivePattern = useAppStore((state) => state.transposeActivePattern)
  const addArrangementPattern = useAppStore((state) => state.addArrangementPattern)
  const removeArrangementPattern = useAppStore((state) => state.removeArrangementPattern)
  const clearArrangement = useAppStore((state) => state.clearArrangement)
  const setArrangementTranspose = useAppStore((state) => state.setArrangementTranspose)
  const setArrangementRotation = useAppStore((state) => state.setArrangementRotation)
  const toggleArrangementMute = useAppStore((state) => state.toggleArrangementMute)
  const setArrangementLayer = useAppStore((state) => state.setArrangementLayer)
  const setArrangementEffect = useAppStore((state) => state.setArrangementEffect)
  const setAutomationPoint = useAppStore((state) => state.setAutomationPoint)
  const setAutomationMode = useAppStore((state) => state.setAutomationMode)
  const setStepExpression = useAppStore((state) => state.setStepExpression)
  const pattern = getActivePattern(composition)
  const inspectedStep = Math.min(selectedStep, pattern.steps.length - 1)
  const selected = pattern.steps[inspectedStep]
  const beatSize = stepsPerBeat(composition.meter)
  const subdivisions = beatSize === 2 ? ['1', '&'] : ['1', 'e', '&', 'a']
  const beatCount = Math.ceil(pattern.steps.length / beatSize)
  const beatsPerBar = Number(composition.meter.split('/')[0])
  const beatLabel = (beat: number) => beatCount > beatsPerBar ? `Bar ${Math.floor(beat / beatsPerBar) + 1} · ${beat % beatsPerBar + 1}` : `Beat ${beat + 1}`
  const gridMinWidth = Math.max(686, 82 + pattern.steps.length * 38)
  const gridStyle = { '--step-count': pattern.steps.length, '--grid-min-width': `${gridMinWidth}px` } as React.CSSProperties
  const suggestions = chordSuggestions(composition)
  const automation = pattern.automation[automationTarget]
  const automationMode = pattern.automationModes?.[automationTarget] ?? 'hold'
  const automationConfig = automationBounds[automationTarget]
  const fallbackAutomation = automationTarget === 'mask' ? composition.voices.chords.cutoff : composition.sound[automationTarget]
  const resolvedAutomation = automation.map((_, index) => resolveAutomationValue(automation, index, fallbackAutomation, automationMode))
  const occurrenceIndex = Math.min(selectedOccurrenceIndex, composition.arrangement.length - 1)
  const occurrence = composition.arrangement[occurrenceIndex]
  const occurrenceEffectConfig = occurrenceEffectBounds[occurrenceEffectTarget]
  const occurrenceEffectValue = occurrence?.effects[occurrenceEffectTarget] ?? occurrenceEffectConfig.neutral

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
          {composition.arrangement.map((item, index) => (
            <button type="button" key={`${item.pattern}-${index}`} className={`${index === arrangementIndex ? 'is-playing ' : ''}${index === occurrenceIndex ? 'is-selected' : ''}`} aria-pressed={index === occurrenceIndex} title={arrangementOccurrenceDescription(item, index)} onClick={() => { setSelectedOccurrenceIndex(index); selectPattern(item.pattern) }}>{arrangementOccurrenceLabel(item)}</button>
          ))}
        </div>
        <div className="arrangement-add" aria-label="Append pattern to arrangement">
          {PATTERN_IDS.map((id) => <button type="button" key={id} disabled={composition.arrangement.length >= 16} onClick={() => { setSelectedOccurrenceIndex(composition.arrangement.length); addArrangementPattern(id) }}>+{id}</button>)}
        </div>
        <button type="button" className="arrangement-clear" title="Start arrangement with the active pattern" onClick={() => { setSelectedOccurrenceIndex(0); clearArrangement() }}><RotateCcw size={12} /></button>
      </div>

      {occurrence && (
        <div className="occurrence-editor" aria-label={`Arrangement occurrence ${occurrenceIndex + 1} transformations`}>
          <div className="occurrence-editor__heading">
            <div><span className="eyebrow">Occurrence {occurrenceIndex + 1}</span><strong>Pattern {occurrence.pattern}</strong></div>
            <button type="button" disabled={composition.arrangement.length <= 1} title="Remove selected occurrence" onClick={() => removeArrangementPattern(occurrenceIndex)}><Trash2 size={12} /> Remove</button>
          </div>
          <div className="occurrence-editor__row">
            <span>Transpose <output>{occurrence.transpose > 0 ? '+' : ''}{occurrence.transpose}</output></span>
            <div className="occurrence-editor__buttons">
              {[-12, -1, 1, 12].map((amount) => <button type="button" key={amount} disabled={occurrence.transpose + amount < -24 || occurrence.transpose + amount > 24} onClick={() => setArrangementTranspose(occurrenceIndex, occurrence.transpose + amount)}>{amount > 0 ? '+' : ''}{amount}</button>)}
              <button type="button" disabled={occurrence.transpose === 0} onClick={() => setArrangementTranspose(occurrenceIndex, 0)}>Reset</button>
            </div>
          </div>
          <div className="occurrence-editor__row">
            <span>Rotate memory <output>{occurrence.rotate > 0 ? '+' : ''}{occurrence.rotate}</output></span>
            <div className="occurrence-editor__buttons">
              {[-4, -1, 1, 4].map((amount) => <button type="button" key={amount} disabled={occurrence.rotate + amount < -63 || occurrence.rotate + amount > 63} onClick={() => setArrangementRotation(occurrenceIndex, occurrence.rotate + amount)}>{amount > 0 ? '+' : ''}{amount}</button>)}
              <button type="button" disabled={occurrence.rotate === 0} onClick={() => setArrangementRotation(occurrenceIndex, 0)}>Reset</button>
            </div>
          </div>
          <div className="occurrence-editor__row">
            <span>Mute this time</span>
            <div className="occurrence-editor__buttons">
              {VOICE_IDS.map((voice) => <button type="button" key={voice} className={occurrence.mute.includes(voice) ? 'is-active' : ''} aria-pressed={occurrence.mute.includes(voice)} onClick={() => toggleArrangementMute(occurrenceIndex, voice)}>{voice === 'chords' ? 'Chord' : voice[0].toUpperCase() + voice.slice(1)}</button>)}
            </div>
          </div>
          <div className="occurrence-editor__layers">
            <span>Layer focus</span>
            {VOICE_IDS.map((voice) => (
              <label key={voice}>{voice === 'chords' ? 'Chord' : voice[0].toUpperCase() + voice.slice(1)}
                <select value={occurrence.layers[voice] ?? 'all'} onChange={(event) => setArrangementLayer(occurrenceIndex, voice, event.target.value as ArrangementLayerSelection)}>
                  <option value="all">All enabled</option>
                  <option value="primary">Primary only</option>
                  <option value="shadow">Shadow only</option>
                </select>
              </label>
            ))}
          </div>
          <div className="occurrence-editor__row occurrence-editor__effect">
            <span>Effect transform <output>{occurrenceEffectTarget === 'mask' ? `×${occurrenceEffectValue.toFixed(2)}` : `${occurrenceEffectValue >= 0 ? '+' : ''}${occurrenceEffectValue.toFixed(2)}`}</output></span>
            <select aria-label="Occurrence effect target" value={occurrenceEffectTarget} onChange={(event) => setOccurrenceEffectTarget(event.target.value as OccurrenceEffectTarget)}>
              {(Object.keys(occurrenceEffectBounds) as OccurrenceEffectTarget[]).map((target) => <option key={target} value={target}>{occurrenceEffectBounds[target].label}</option>)}
            </select>
            <input aria-label={`Occurrence ${occurrenceEffectTarget} modifier`} type="range" min={occurrenceEffectConfig.min} max={occurrenceEffectConfig.max} step={occurrenceEffectConfig.step} value={occurrenceEffectValue} onChange={(event) => setArrangementEffect(occurrenceIndex, occurrenceEffectTarget, Number(event.target.value))} />
            <button type="button" disabled={occurrenceEffectValue === occurrenceEffectConfig.neutral} onClick={() => setArrangementEffect(occurrenceIndex, occurrenceEffectTarget, occurrenceEffectConfig.neutral)}>Reset</button>
          </div>
        </div>
      )}

      <div className="sequencer-scroll" tabIndex={0} aria-label={`${pattern.steps.length}-step sequencer; ${composition.meter} meter`}>
        <div className="beat-ruler" style={{ minWidth: gridMinWidth, gridTemplateColumns: `78px repeat(${beatCount}, 1fr)` }} aria-hidden="true">
          <span />
          {Array.from({ length: beatCount }, (_, beat) => <strong key={beat}>{beatLabel(beat)}</strong>)}
        </div>
        <div className="sequencer-grid sequencer-grid--expanded" style={gridStyle}>
          <div className="lane-label lane-label--header">Step</div>
          {pattern.steps.map((_, index) => (
            <div key={`step-${index}`} className={`step-number${index % beatSize === 0 ? ' is-beat-start' : ''}${activeStep === index && playingPatternId === pattern.id ? ' is-current' : ''}${inspectedStep === index ? ' is-selected' : ''}`}>
              <span>{subdivisions[index % beatSize]}</span><small>{String(index + 1).padStart(2, '0')}</small><i />
            </div>
          ))}

          <div className="lane-label"><span>Chords</span><small>Poly voice</small></div>
          {pattern.steps.map((step, index) => (
            <button type="button" key={`notes-${index}`}
              className={`step-cell note-cell${step.notes.length ? ' is-active' : ''}${step.chordTie ? ' is-tied' : ''}${activeStep === index && playingPatternId === pattern.id ? ' is-current' : ''}${inspectedStep === index && selectedLane === 'notes' ? ' is-selected' : ''}`}
              aria-label={`Step ${index + 1} chord: ${step.notes.join(', ') || 'silent'}${step.chordTie ? ', tied to next step' : ''}`} aria-pressed={inspectedStep === index && selectedLane === 'notes'}
              onClick={() => selectLane(index, 'notes')}>
              <span>{shortNotes(step.notes)}</span>{step.notes.length > 0 && (step.chordLength > 1 || step.chordTie) && <small>{step.chordLength > 1 ? step.chordLength : ''}{step.chordTie ? '→' : ''}</small>}
            </button>
          ))}

          <div className="lane-label"><span>Signal</span><small>Lead voice</small></div>
          {pattern.steps.map((step, index) => (
            <button type="button" key={`signal-${index}`}
              className={`step-cell signal-cell${step.signal ? ' is-active' : ''}${step.signalTie ? ' is-tied' : ''}${activeStep === index && playingPatternId === pattern.id ? ' is-current' : ''}${inspectedStep === index && selectedLane === 'signal' ? ' is-selected' : ''}`}
              aria-label={`Step ${index + 1} signal: ${step.signal ?? 'silent'}${step.signalTie ? ', tied to next step' : ''}`} aria-pressed={inspectedStep === index && selectedLane === 'signal'}
              onClick={() => selectLane(index, 'signal')}>
              <span>{step.signal?.replace(/-?\d/, '') ?? '·'}</span>{step.signal && (step.signalLength > 1 || step.signalTie) && <small>{step.signalLength > 1 ? step.signalLength : ''}{step.signalTie ? '→' : ''}</small>}
            </button>
          ))}

          <div className="lane-label"><span>Bass</span><small>Mono voice</small></div>
          {pattern.steps.map((step, index) => (
            <button type="button" key={`bass-${index}`}
              className={`step-cell bass-cell${step.bass ? ' is-active' : ''}${step.bassTie ? ' is-tied' : ''}${activeStep === index && playingPatternId === pattern.id ? ' is-current' : ''}${inspectedStep === index && selectedLane === 'bass' ? ' is-selected' : ''}`}
              aria-label={`Step ${index + 1} bass: ${step.bass ?? 'silent'}${step.bassTie ? ', tied to next step' : ''}`} aria-pressed={inspectedStep === index && selectedLane === 'bass'}
              onClick={() => selectLane(index, 'bass')}>
              <span>{step.bass?.replace(/-?\d/, '') ?? '·'}</span>{step.bass && (step.bassLength > 1 || step.bassTie) && <small>{step.bassLength > 1 ? step.bassLength : ''}{step.bassTie ? '→' : ''}</small>}
            </button>
          ))}

          <div className="lane-label"><span>Pulse</span><small>Percussion</small></div>
          {pattern.steps.map((step, index) => (
            <button type="button" key={`drum-${index}`}
              className={`step-cell drum-cell${step.drum ? ' is-active' : ''}${activeStep === index && playingPatternId === pattern.id ? ' is-current' : ''}${inspectedStep === index && selectedLane === 'drum' ? ' is-selected' : ''}`}
              aria-label={`Step ${index + 1} percussion: ${step.drum ? 'hit' : 'silent'}`} aria-pressed={step.drum}
              onClick={() => toggleAndSelect(index, 'drum')}><i /></button>
          ))}

          <div className="lane-label"><span>Texture</span><small>Noise voice</small></div>
          {pattern.steps.map((step, index) => (
            <button type="button" key={`texture-${index}`}
              className={`step-cell texture-cell${step.texture ? ' is-active' : ''}${activeStep === index && playingPatternId === pattern.id ? ' is-current' : ''}${inspectedStep === index && selectedLane === 'texture' ? ' is-selected' : ''}`}
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
          <div><span className="eyebrow">Selected location</span><strong>{beatLabel(Math.floor(inspectedStep / beatSize))} · {subdivisions[inspectedStep % beatSize]} <small>step {String(inspectedStep + 1).padStart(2, '0')} · {composition.meter}</small></strong></div>
          <button type="button" className="clear-step" onClick={clearSelectedLane}><Trash2 size={12} /> Clear {selectedLane}</button>
        </div>
        <div className="lane-picker" aria-label="Step lane">
          {(['notes', 'signal', 'bass', 'drum', 'texture'] as StepLane[]).map((lane) => <button type="button" key={lane} className={selectedLane === lane ? 'is-active' : ''} onClick={() => selectStep(inspectedStep, lane)}>{lane === 'notes' ? 'Chord' : lane === 'drum' ? 'Pulse' : lane[0].toUpperCase() + lane.slice(1)}</button>)}
        </div>
        {selectedLane === 'notes' && (
          <div className="note-assignment">
            <div className="note-chips">{selected.notes.length ? selected.notes.map((note) => <button type="button" key={note} onClick={() => useAppStore.getState().assignNote(note)}>{note} ×</button>) : <span>No chord yet—use a suggestion or the touch keys.</span>}</div>
            <div className="chord-suggestions">{suggestions.map((chord) => <button type="button" key={chord.name} title={chord.notes.join(' ')} onClick={() => setChord(chord.notes)}>{chord.name}</button>)}</div>
          </div>
        )}
        {selectedLane === 'signal' && <div className="note-chips">{selected.signal ? <button type="button" onClick={clearSelectedLane}>{selected.signal} ×</button> : <span>No Signal note—use the touch keys.</span>}</div>}
        {selectedLane === 'bass' && <div className="note-chips">{selected.bass ? <button type="button" onClick={clearSelectedLane}>{selected.bass} ×</button> : <span>No bass note—use the touch keys.</span>}</div>}
        {(selectedLane === 'notes' || selectedLane === 'signal' || selectedLane === 'bass') && (
          <div className="pitched-lifecycle-controls">
            <label className="length-control">Length <select value={selectedLane === 'notes' ? selected.chordLength : selectedLane === 'signal' ? selected.signalLength : selected.bassLength} onChange={(event) => setStepLength(selectedLane as NoteLane, Number(event.target.value))}>{[1, 2, 3, 4, 8].map((length) => <option key={length} value={length}>{length} step{length > 1 ? 's' : ''}</option>)}</select></label>
            <label className="tie-control"><input type="checkbox" disabled={selectedLane === 'notes' ? selected.notes.length === 0 : selectedLane === 'signal' ? !selected.signal : !selected.bass} checked={selectedLane === 'notes' ? selected.chordTie : selectedLane === 'signal' ? selected.signalTie : selected.bassTie} onChange={(event) => setStepTie(selectedLane as NoteLane, event.target.checked)} /> Tie to next step <small>Legato</small></label>
          </div>
        )}
        <div className="step-expression">
          <label><span>Chance <output>{Math.round(selected.probability * 100)}%</output></span><input type="range" min={0} max={1} step={0.05} value={selected.probability} onChange={(event) => setStepExpression('probability', Number(event.target.value))} /></label>
          <label><span>Ratchet</span><select value={selected.ratchets} onChange={(event) => setStepExpression('ratchets', Number(event.target.value))}>{[1, 2, 3, 4].map((count) => <option key={count} value={count}>{count} hit{count > 1 ? 's' : ''}</option>)}</select></label>
          <label><span>Shift <output>{selected.microShift > 0 ? '+' : ''}{Math.round(selected.microShift * 100)}%</output></span><input type="range" min={-0.45} max={0.45} step={0.01} value={selected.microShift} onChange={(event) => setStepExpression('microShift', Number(event.target.value))} /></label>
        </div>
      </div>

      <div className="automation-editor">
        <div className="automation-heading">
          <span>Automation</span>
          <select value={automationTarget} onChange={(event) => setAutomationTarget(event.target.value as AutomationTarget)}>
            {(Object.keys(automationBounds) as AutomationTarget[]).map((target) => <option key={target} value={target}>{target} · {automationBounds[target].label}</option>)}
          </select>
          <select aria-label="Automation interpolation" value={automationMode} onChange={(event) => setAutomationMode(automationTarget, event.target.value === 'linear' ? 'linear' : 'hold')}>
            <option value="hold">Hold</option>
            <option value="linear">Linear</option>
          </select>
          <button type="button" disabled={automation[inspectedStep] === null} onClick={() => setAutomationPoint(automationTarget, inspectedStep, null)}>Clear point</button>
        </div>
        <div className="automation-lane" style={{ '--step-count': automation.length } as React.CSSProperties}>
          {automation.map((value, index) => (
            <button type="button" key={index} className={`${value !== null ? 'has-point' : ''}${inspectedStep === index ? ' is-selected' : ''}`} onClick={() => { selectStep(index); if (value === null) setAutomationPoint(automationTarget, index, resolvedAutomation[index]) }} aria-label={`${automationTarget} step ${index + 1}: ${value === null ? `${resolvedAutomation[index]} ${automationMode} preview` : `${value} point`}`}>
              <i style={{ '--automation': (resolvedAutomation[index] - automationConfig.min) / (automationConfig.max - automationConfig.min) } as React.CSSProperties} />
            </button>
          ))}
        </div>
        <input type="range" min={automationConfig.min} max={automationConfig.max} step={automationConfig.step} value={automation[inspectedStep] ?? resolvedAutomation[inspectedStep]} aria-label={`${automationTarget} at selected step`} onChange={(event) => setAutomationPoint(automationTarget, inspectedStep, Number(event.target.value))} />
      </div>
    </section>
  )
}
