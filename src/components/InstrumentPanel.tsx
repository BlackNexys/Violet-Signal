import { useEffect } from 'react'
import { Activity, AudioWaveform, CloudRain, Gauge, Radio, RotateCcw, ShieldCheck, Snowflake, Zap } from 'lucide-react'
import { midiToNote, notesForScale, noteToMidi, type FilterType, type VoiceId, type Waveform } from '../model/composition'
import { useAppStore } from '../state/store'
import { ControlSlider } from './ControlSlider'

interface InstrumentPanelProps { audition: (note: string) => void }

const voiceLabels: Record<VoiceId, string> = { chords: 'Chord', bass: 'Bass', pulse: 'Pulse', texture: 'Texture' }
const waveforms: Array<{ value: Waveform; label: string }> = [
  { value: 'sine', label: 'Sine — soft' }, { value: 'triangle', label: 'Triangle — glass' },
  { value: 'square', label: 'Square — hollow' }, { value: 'sawtooth', label: 'Saw — bright' },
]
const filterTypes: Array<{ value: FilterType; label: string }> = [
  { value: 'lowpass', label: 'Low-pass — warm' }, { value: 'bandpass', label: 'Band-pass — focused' }, { value: 'highpass', label: 'High-pass — thin' },
]
const keyBindings = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k']

export function InstrumentPanel({ audition }: InstrumentPanelProps) {
  const composition = useAppStore((state) => state.composition)
  const selectedVoice = useAppStore((state) => state.selectedVoice)
  const selectedLane = useAppStore((state) => state.selectedLane)
  const selectedStep = useAppStore((state) => state.selectedStep)
  const recordArmed = useAppStore((state) => state.recordArmed)
  const exhaustion = useAppStore((state) => state.exhaustion)
  const performancePressure = useAppStore((state) => state.performancePressure)
  const memoryFreeze = useAppStore((state) => state.memoryFreeze)
  const updateSound = useAppStore((state) => state.updateSound)
  const updateVoice = useAppStore((state) => state.updateVoice)
  const updateRoot = useAppStore((state) => state.updateRoot)
  const selectVoice = useAppStore((state) => state.selectVoice)
  const assignNote = useAppStore((state) => state.assignNote)
  const setPerformancePressure = useAppStore((state) => state.setPerformancePressure)
  const setMemoryFreeze = useAppStore((state) => state.setMemoryFreeze)
  const voice = composition.voices[selectedVoice]
  const scaleNotes = notesForScale(composition.scaleRoot, composition.scaleMode)
  const rootMidi = noteToMidi(`${composition.scaleRoot}4`) ?? 60
  const keyboard = composition.scaleLock ? scaleNotes : Array.from({ length: 8 }, (_, interval) => midiToNote(rootMidi + interval))

  const playAndAssign = (note: string) => {
    audition(note)
    if (selectedLane === 'notes' || selectedLane === 'bass') assignNote(note)
  }
  const gestureKey = (active: boolean, setter: (value: boolean) => void) => (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== ' ' && event.key !== 'Enter') return
    event.preventDefault()
    setter(active)
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (event.repeat || target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName ?? '')) return
      const keyIndex = keyBindings.indexOf(event.key.toLowerCase())
      if (keyIndex < 0) return
      event.preventDefault()
      playAndAssign(keyboard[keyIndex])
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  return (
    <section className="workspace-panel instrument-panel" aria-labelledby="instrument-heading">
      <div className="panel-heading">
        <div><span className="eyebrow">Four independent voices</span><h2 id="instrument-heading">Instrument</h2></div>
        <AudioWaveform size={19} aria-hidden="true" />
      </div>

      <div className="voice-tabs" aria-label="Voice controls">
        {(Object.keys(voiceLabels) as VoiceId[]).map((id) => (
          <button type="button" key={id} className={selectedVoice === id ? 'is-active' : ''} onClick={() => selectVoice(id)}>
            {id === 'texture' && <Radio size={11} />}{voiceLabels[id]}
          </button>
        ))}
      </div>
      <div className="voice-mix-row">
        <span>{voiceLabels[selectedVoice]} channel</span>
        <button type="button" className={voice.mute ? 'is-active is-warning' : ''} onClick={() => updateVoice(selectedVoice, 'mute', !voice.mute)}>Mute</button>
        <button type="button" className={voice.solo ? 'is-active' : ''} onClick={() => updateVoice(selectedVoice, 'solo', !voice.solo)}>Solo</button>
      </div>

      <div className="signal-block">
        <div className="signal-title"><Activity size={15} /><span>Core <small>Oscillator & channel</small></span></div>
        <label className="select-control"><span className="sr-only">Core waveform</span>
          <select value={voice.core} onChange={(event) => updateVoice(selectedVoice, 'core', event.target.value as Waveform)}>{waveforms.map((waveform) => <option key={waveform.value} value={waveform.value}>{waveform.label}</option>)}</select>
        </label>
        <label className="select-control voice-filter-select"><span className="sr-only">Filter character</span>
          <select value={voice.filterType} onChange={(event) => updateVoice(selectedVoice, 'filterType', event.target.value as FilterType)}>{filterTypes.map((filter) => <option key={filter.value} value={filter.value}>{filter.label}</option>)}</select>
        </label>
        <div className="two-controls">
          <ControlSlider label="Mask" conventional="Filter cutoff" value={voice.cutoff} min={180} max={9000} step={10} format={(value) => value >= 1000 ? `${(value / 1000).toFixed(1)}k` : `${value}`} onChange={(value) => updateVoice(selectedVoice, 'cutoff', value)} />
          <ControlSlider label="Focus" conventional="Filter resonance" value={voice.resonance} min={0} max={12} step={0.1} format={(value) => value.toFixed(1)} onChange={(value) => updateVoice(selectedVoice, 'resonance', value)} />
          <ControlSlider label="Level" conventional="Channel volume" value={voice.volume} min={-36} max={-4} step={1} format={(value) => `${value} dB`} onChange={(value) => updateVoice(selectedVoice, 'volume', value)} />
          <ControlSlider label="Drift" conventional="Oscillator detune" value={voice.detune} min={-100} max={100} step={1} format={(value) => `${value} ct`} onChange={(value) => updateVoice(selectedVoice, 'detune', value)} />
          <ControlSlider label="Glide" conventional="Pitch portamento" value={voice.glide} min={0} max={0.5} step={0.005} format={(value) => `${Math.round(value * 1000)} ms`} onChange={(value) => updateVoice(selectedVoice, 'glide', value)} />
        </div>
      </div>

      <div className="signal-block envelope-block">
        <div className="signal-title"><ShieldCheck size={15} /><span>Body <small>Envelope</small></span></div>
        <div className="two-controls">
          <ControlSlider label="Arrival" conventional="Attack" value={voice.attack} min={0.005} max={1.2} step={0.005} onChange={(value) => updateVoice(selectedVoice, 'attack', value)} />
          <ControlSlider label="Settle" conventional="Decay" value={voice.decay} min={0.02} max={3} step={0.01} onChange={(value) => updateVoice(selectedVoice, 'decay', value)} />
          <ControlSlider label="Hold" conventional="Sustain" value={voice.sustain} min={0} max={1} step={0.01} onChange={(value) => updateVoice(selectedVoice, 'sustain', value)} />
          <ControlSlider label="Fade" conventional="Release" value={voice.release} min={0.05} max={4} step={0.01} onChange={(value) => updateVoice(selectedVoice, 'release', value)} />
        </div>
      </div>

      <div className="signal-block effects-block">
        <div className="signal-title"><CloudRain size={15} /><span>Afterimage <small>Shared effects</small></span></div>
        <div className="two-controls">
          <ControlSlider label="Memory" conventional="Delay" value={composition.sound.memory} min={0} max={1} step={0.01} onChange={(value) => updateSound('memory', value)} />
          <ControlSlider label="Environment" conventional="Reverb" value={composition.sound.environment} min={0} max={1} step={0.01} onChange={(value) => updateSound('environment', value)} />
          <ControlSlider label="Veil" conventional="Chorus width" value={composition.sound.veil} min={0} max={1} step={0.01} onChange={(value) => updateSound('veil', value)} />
          <ControlSlider label="Fracture" conventional="Bit reduction" value={composition.sound.fracture} min={0} max={1} step={0.01} onChange={(value) => updateSound('fracture', value)} />
          <ControlSlider label="Ghost" conventional="Probability" value={composition.sound.ghost} min={0} max={1} step={0.01} onChange={(value) => updateSound('ghost', value)} />
          <ControlSlider label="Humanize" conventional="Timing variation" value={composition.sound.humanize} min={0} max={0.2} step={0.002} format={(value) => `${Math.round(value * 100)}%`} onChange={(value) => updateSound('humanize', value)} />
        </div>
      </div>

      <div className={`overclock-shell${exhaustion > 0 ? ' is-exhausted' : ''}`}>
        <div className="overclock-label"><Gauge size={18} /><span><strong>Overclock</strong><small>Harmonics · drive · activity</small></span>{exhaustion > 0 && <span className="recovery-badge"><RotateCcw size={12} /> recovering</span>}</div>
        <ControlSlider label="Signal pressure" conventional="Performance macro" value={composition.sound.overclock} min={0} max={1} step={0.01} prominent format={(value) => `${Math.round(value * 100)}%`} onChange={(value) => updateSound('overclock', value)} />
        <div className="performance-gestures">
          <button type="button" className={performancePressure ? 'is-active' : ''} onPointerDown={() => setPerformancePressure(true)} onPointerUp={() => setPerformancePressure(false)} onPointerLeave={() => setPerformancePressure(false)} onKeyDown={gestureKey(true, setPerformancePressure)} onKeyUp={gestureKey(false, setPerformancePressure)} onBlur={() => setPerformancePressure(false)}><Zap size={12} /> Pressure</button>
          <button type="button" className={memoryFreeze ? 'is-active' : ''} onPointerDown={() => setMemoryFreeze(true)} onPointerUp={() => setMemoryFreeze(false)} onPointerLeave={() => setMemoryFreeze(false)} onKeyDown={gestureKey(true, setMemoryFreeze)} onKeyUp={gestureKey(false, setMemoryFreeze)} onBlur={() => setMemoryFreeze(false)}><Snowflake size={12} /> Freeze memory</button>
        </div>
        <p>{exhaustion > 0 ? 'The circuit is cooling: brightness and density are briefly reduced.' : 'Hold a performance gesture for a temporary transformation; automation remains unchanged.'}</p>
      </div>

      <div className="keyboard-heading">
        <span>Assign & play · step {String(selectedStep + 1).padStart(2, '0')} · {selectedLane}</span>
        <label className="lock-toggle" title="Scale lock keeps playable keys inside the selected scale"><input type="checkbox" checked={composition.scaleLock} onChange={(event) => updateRoot('scaleLock', event.target.checked)} />Scale lock</label>
      </div>
      <div className="touch-keyboard" aria-label={composition.scaleLock ? `${composition.scaleRoot} ${composition.scaleMode} playable notes` : 'Chromatic playable notes'}>
        {keyboard.map((note, index) => (
          <button key={note} type="button" className={index === 0 || index === 7 ? 'root-key' : ''} onClick={() => playAndAssign(note)}>
            <kbd>{keyBindings[index].toUpperCase()}</kbd><span>{note.replace(/-?\d/, '')}</span><small>{note.match(/-?\d/)?.[0]}</small>
          </button>
        ))}
      </div>
      {recordArmed && <p className="record-hint"><span /> Recording keys into the sounding step</p>}
    </section>
  )
}
