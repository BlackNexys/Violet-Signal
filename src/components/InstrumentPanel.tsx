import { useEffect } from 'react'
import { Activity, AudioWaveform, CloudRain, Gauge, GitBranch, Radio, RotateCcw, ShieldCheck, Snowflake, Zap } from 'lucide-react'
import {
  ENGINES_BY_VOICE,
  SCALE_MODES,
  SCALE_ROOTS,
  midiToNote,
  notesForScale,
  noteToMidi,
  type FilterType,
  type InstrumentEngine,
  type LayerSlot,
  type ScaleMode,
  type VoiceId,
  type Waveform,
} from '../model/composition'
import { getInstrumentPatch, patchesForVoice, SOUND_PACKS } from '../model/instrumentPacks'
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
const engineLabels: Record<InstrumentEngine, string> = {
  subtractive: 'Signal — classic synth',
  fm: 'Specter — FM',
  am: 'Halo — AM',
  dual: 'Twin — dual oscillator',
  pluck: 'Wire — physical pluck',
  membrane: 'Impact — membrane',
  metal: 'Shard — metallic',
  noise: 'Weather — noise',
}
const keyBindings = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k']
const scaleModeLabels: Record<ScaleMode, string> = {
  minor: 'Minor', major: 'Major', dorian: 'Dorian', phrygian: 'Phrygian',
  'harmonic minor': 'Harmonic minor', 'melodic minor': 'Melodic minor', pentatonic: 'Pentatonic',
}

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
  const updateVoiceSend = useAppStore((state) => state.updateVoiceSend)
  const updateVoiceLayer = useAppStore((state) => state.updateVoiceLayer)
  const applyInstrumentPatch = useAppStore((state) => state.applyInstrumentPatch)
  const updateRoot = useAppStore((state) => state.updateRoot)
  const selectVoice = useAppStore((state) => state.selectVoice)
  const assignNote = useAppStore((state) => state.assignNote)
  const setPerformancePressure = useAppStore((state) => state.setPerformancePressure)
  const setMemoryFreeze = useAppStore((state) => state.setMemoryFreeze)
  const voice = composition.voices[selectedVoice]
  const compatiblePatches = patchesForVoice(selectedVoice)
  const activePatch = voice.patchId ? getInstrumentPatch(voice.patchId) : null
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

      <div className="signal-block patch-block">
        <div className="signal-title"><Radio size={15} /><span>Sound <small>Voice patch</small></span></div>
        <label className="select-control patch-select"><span className="sr-only">Sound patch</span>
          <select value={voice.patchId ?? 'custom'} onChange={(event) => event.target.value !== 'custom' && applyInstrumentPatch(selectedVoice, event.target.value)}>
            <option value="custom">Custom voice</option>
            {compatiblePatches.map((patch) => {
              const pack = SOUND_PACKS.find((item) => item.id === patch.packId)
              return <option key={patch.id} value={patch.id}>{pack?.label ?? patch.packId} · {patch.label}</option>
            })}
          </select>
        </label>
        <p className="patch-description">{activePatch ? <><strong>{activePatch.label}</strong> · {activePatch.conventionalDescription}</> : 'Manual layer and channel settings.'}</p>
      </div>

      <div className="signal-block">
        <div className="signal-title"><Activity size={15} /><span>Layers <small>Primary & shadow sources</small></span></div>
        <div className="layer-rack">
          {(['primary', 'shadow'] as LayerSlot[]).map((slot) => {
            const layer = voice.layers[slot]
            const pitched = layer.engine !== 'noise'
            return (
              <div className={`layer-row${slot === 'shadow' && !layer.enabled ? ' is-disabled' : ''}`} key={slot}>
                <div className="layer-heading">
                  <span><strong>{slot === 'primary' ? 'Primary' : 'Shadow'}</strong><small>{slot === 'primary' ? 'Main sound layer' : 'Second sound layer'}</small></span>
                  {slot === 'shadow' && <button type="button" className={layer.enabled ? 'is-active' : ''} onClick={() => updateVoiceLayer(selectedVoice, slot, 'enabled', !layer.enabled)}>{layer.enabled ? 'On' : 'Off'}</button>}
                </div>
                <label className="select-control"><span className="sr-only">{slot} engine</span>
                  <select value={layer.engine} onChange={(event) => updateVoiceLayer(selectedVoice, slot, 'engine', event.target.value as InstrumentEngine)}>
                    {ENGINES_BY_VOICE[selectedVoice].map((engine) => <option key={engine} value={engine}>{engineLabels[engine]}</option>)}
                  </select>
                </label>
                <label className="select-control"><span className="sr-only">{slot} waveform</span>
                  <select value={layer.waveform} onChange={(event) => updateVoiceLayer(selectedVoice, slot, 'waveform', event.target.value as Waveform)}>{waveforms.map((waveform) => <option key={waveform.value} value={waveform.value}>{waveform.label}</option>)}</select>
                </label>
                <div className="two-controls layer-controls">
                  {pitched && <ControlSlider label="Altitude" conventional="Octave shift" value={layer.octave} min={-2} max={2} step={1} format={(value) => `${value > 0 ? '+' : ''}${value} oct`} onChange={(value) => updateVoiceLayer(selectedVoice, slot, 'octave', value)} />}
                  {pitched && <ControlSlider label="Drift" conventional="Layer detune" value={layer.detune} min={-100} max={100} step={1} format={(value) => `${value} ct`} onChange={(value) => updateVoiceLayer(selectedVoice, slot, 'detune', value)} />}
                  <ControlSlider label="Layer" conventional="Layer level" value={layer.level} min={-36} max={0} step={1} format={(value) => `${value} dB`} onChange={(value) => updateVoiceLayer(selectedVoice, slot, 'level', value)} />
                  <ControlSlider label="Character" conventional="Engine tone" value={layer.character} min={0} max={1} step={0.01} format={(value) => `${Math.round(value * 100)}%`} onChange={(value) => updateVoiceLayer(selectedVoice, slot, 'character', value)} />
                </div>
                <details className="layer-advanced">
                  <summary>Layer response</summary>
                  <div className="two-controls">
                    <ControlSlider label="Arrival ×" conventional="Layer attack scale" value={layer.attackScale} min={0.25} max={4} step={0.05} format={(value) => `${value.toFixed(2)}×`} onChange={(value) => updateVoiceLayer(selectedVoice, slot, 'attackScale', value)} />
                    <ControlSlider label="Fade ×" conventional="Layer release scale" value={layer.releaseScale} min={0.25} max={4} step={0.05} format={(value) => `${value.toFixed(2)}×`} onChange={(value) => updateVoiceLayer(selectedVoice, slot, 'releaseScale', value)} />
                  </div>
                </details>
              </div>
            )
          })}
        </div>
        <label className="select-control voice-filter-select"><span className="sr-only">Filter character</span>
          <select value={voice.filterType} onChange={(event) => updateVoice(selectedVoice, 'filterType', event.target.value as FilterType)}>{filterTypes.map((filter) => <option key={filter.value} value={filter.value}>{filter.label}</option>)}</select>
        </label>
        <div className="two-controls">
          <ControlSlider label="Mask" conventional="Filter cutoff" value={voice.cutoff} min={180} max={9000} step={10} format={(value) => value >= 1000 ? `${(value / 1000).toFixed(1)}k` : `${value}`} onChange={(value) => updateVoice(selectedVoice, 'cutoff', value)} />
          <ControlSlider label="Focus" conventional="Filter resonance" value={voice.resonance} min={0} max={12} step={0.1} format={(value) => value.toFixed(1)} onChange={(value) => updateVoice(selectedVoice, 'resonance', value)} />
          <ControlSlider label="Level" conventional="Channel volume" value={voice.volume} min={-36} max={-4} step={1} format={(value) => `${value} dB`} onChange={(value) => updateVoice(selectedVoice, 'volume', value)} />
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

      <div className="signal-block send-block">
        <div className="signal-title"><GitBranch size={15} /><span>Depth <small>{voiceLabels[selectedVoice]} effect sends</small></span></div>
        <p className="send-description">Choose how much of this voice enters each shared effect return.</p>
        <div className="two-controls">
          <ControlSlider label="Fracture send" conventional="Bit-reduction depth" value={voice.sends.fracture} min={0} max={1} step={0.01} format={(value) => `${Math.round(value * 100)}%`} onChange={(value) => updateVoiceSend(selectedVoice, 'fracture', value)} />
          <ControlSlider label="Veil send" conventional="Chorus depth" value={voice.sends.veil} min={0} max={1} step={0.01} format={(value) => `${Math.round(value * 100)}%`} onChange={(value) => updateVoiceSend(selectedVoice, 'veil', value)} />
          <ControlSlider label="Memory send" conventional="Delay depth" value={voice.sends.memory} min={0} max={1} step={0.01} format={(value) => `${Math.round(value * 100)}%`} onChange={(value) => updateVoiceSend(selectedVoice, 'memory', value)} />
          <ControlSlider label="Environment send" conventional="Reverb depth" value={voice.sends.environment} min={0} max={1} step={0.01} format={(value) => `${Math.round(value * 100)}%`} onChange={(value) => updateVoiceSend(selectedVoice, 'environment', value)} />
        </div>
      </div>

      <div className="signal-block effects-block">
        <div className="signal-title"><CloudRain size={15} /><span>Afterimage <small>Shared effect character</small></span></div>
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
        <div className="scale-controls">
          <label><span className="sr-only">Scale root</span><select value={composition.scaleRoot} onChange={(event) => updateRoot('scaleRoot', event.target.value)}>{SCALE_ROOTS.map((root) => <option key={root}>{root}</option>)}</select></label>
          <label><span className="sr-only">Scale mode</span><select value={composition.scaleMode} onChange={(event) => updateRoot('scaleMode', event.target.value)}>{SCALE_MODES.map((mode) => <option key={mode} value={mode}>{scaleModeLabels[mode]}</option>)}</select></label>
          <label className="lock-toggle" title="Scale lock keeps playable keys inside the selected scale"><input type="checkbox" checked={composition.scaleLock} onChange={(event) => updateRoot('scaleLock', event.target.checked)} />Scale lock</label>
        </div>
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
