import { useState } from 'react'
import {
  AudioLines,
  CircleDot,
  CircleStop,
  Code2,
  Grid3X3,
  Headphones,
  Pause,
  Play,
  Redo2,
  RotateCcw,
  ShieldAlert,
  SlidersHorizontal,
  Undo2,
} from 'lucide-react'
import { useAudioEngine } from './audio/useAudioEngine'
import { CodePanel } from './components/CodePanel'
import { ControlSlider } from './components/ControlSlider'
import { InstrumentPanel } from './components/InstrumentPanel'
import { LearningCenter } from './components/LearningCenter'
import { ProjectTools } from './components/ProjectTools'
import { SequencerPanel } from './components/SequencerPanel'
import { scenes } from './model/scenes'
import { SOUND_WORLD_PROFILES } from './model/composition'
import { useAppStore } from './state/store'

type WorkspaceTab = 'instrument' | 'sequence' | 'code'

export default function App() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('sequence')
  const composition = useAppStore((state) => state.composition)
  const currentSceneId = useAppStore((state) => state.currentSceneId)
  const isPlaying = useAppStore((state) => state.isPlaying)
  const audioReady = useAppStore((state) => state.audioReady)
  const activeStep = useAppStore((state) => state.activeStep)
  const historyCount = useAppStore((state) => state.history.length)
  const futureCount = useAppStore((state) => state.future.length)
  const pending = useAppStore((state) => Boolean(state.pendingComposition))
  const recordArmed = useAppStore((state) => state.recordArmed)
  const loadScene = useAppStore((state) => state.loadScene)
  const resetScene = useAppStore((state) => state.resetScene)
  const updateRoot = useAppStore((state) => state.updateRoot)
  const undo = useAppStore((state) => state.undo)
  const redo = useAppStore((state) => state.redo)
  const setRecordArmed = useAppStore((state) => state.setRecordArmed)
  const { enable, play, pause, stop, panic, audition, startCapture, stopCapture } = useAudioEngine()
  const worldProfile = SOUND_WORLD_PROFILES[composition.world]

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="signal-mark" aria-hidden="true"><i /><i /><i /></div>
          <div>
            <span className="brand-kicker">Blacklight instrument 01</span>
            <h1>Violet Signal</h1>
          </div>
        </div>

        <div className="scene-picker">
          <label htmlFor="scene-select">Scene</label>
          <select id="scene-select" value={currentSceneId} onChange={(event) => loadScene(event.target.value)}>
            {currentSceneId === 'custom' && <option value="custom">Custom project</option>}
            {scenes.map((scene) => <option key={scene.id} value={scene.id}>{scene.name} · {SOUND_WORLD_PROFILES[scene.world].label}</option>)}
          </select>
          <p className="scene-world"><strong>{worldProfile.label}</strong><span>{worldProfile.description}</span></p>
        </div>

        <div className="transport" aria-label="Transport controls">
          {!audioReady && (
            <button type="button" className="enable-audio" onClick={() => void enable()}>
              <Headphones size={15} /> Enable audio
            </button>
          )}
          {isPlaying ? (
            <button type="button" className="transport-main" aria-label="Pause" onClick={pause}><Pause size={17} fill="currentColor" /></button>
          ) : (
            <button type="button" className="transport-main" aria-label="Play" onClick={() => void play()}><Play size={17} fill="currentColor" /></button>
          )}
          <button type="button" className="icon-button" aria-label="Stop and return to step one" title="Stop" onClick={stop}><CircleStop size={17} /></button>
          <button type="button" className={`icon-button record-arm${recordArmed ? ' is-active' : ''}`} aria-label="Record played keys into the sounding step" aria-pressed={recordArmed} title="Step record" onClick={() => setRecordArmed(!recordArmed)}><CircleDot size={17} /></button>
          <div className={`transport-state${isPlaying ? ' is-running' : ''}`}>
            <i />
            <span>{isPlaying ? `Playing · ${String(activeStep + 1).padStart(2, '0')}` : audioReady ? 'Audio ready' : 'Audio asleep'}</span>
          </div>
        </div>

        <div className="header-parameters">
          <ControlSlider label="Tempo" conventional="Beats per minute" value={composition.bpm} min={40} max={180} step={1} format={(value) => `${value} bpm`} onChange={(value) => updateRoot('bpm', value)} />
          <ControlSlider label="Output" conventional="Master volume" value={composition.masterVolume} min={-36} max={-6} step={1} format={(value) => `${value} dB`} onChange={(value) => updateRoot('masterVolume', value)} />
        </div>
      </header>

      <div className="utility-row">
        <p><AudioLines size={14} /> {composition.scaleRoot} {composition.scaleMode} · seed {composition.seed} {pending && <em>· change queued</em>}</p>
        <div>
          <LearningCenter onViewChange={setActiveTab} />
          <button type="button" className="text-button" disabled={!historyCount} onClick={undo}><Undo2 size={14} /> Undo</button>
          <button type="button" className="text-button" disabled={!futureCount} onClick={redo}><Redo2 size={14} /> Redo</button>
          <button type="button" className="text-button" onClick={resetScene}><RotateCcw size={14} /> Reset scene</button>
          <button type="button" className="text-button panic-button" title="Silence every voice and reset the audio transport" onClick={panic}><ShieldAlert size={14} /> Panic</button>
        </div>
      </div>

      <ProjectTools startCapture={startCapture} stopCapture={stopCapture} />

      <nav className="mobile-tabs" aria-label="Workspace views">
        <button type="button" className={activeTab === 'instrument' ? 'is-active' : ''} onClick={() => setActiveTab('instrument')}><SlidersHorizontal size={15} /> Instrument</button>
        <button type="button" className={activeTab === 'sequence' ? 'is-active' : ''} onClick={() => setActiveTab('sequence')}><Grid3X3 size={15} /> Sequence</button>
        <button type="button" className={activeTab === 'code' ? 'is-active' : ''} onClick={() => setActiveTab('code')}><Code2 size={15} /> Code</button>
      </nav>

      <main className="workspace">
        <div className={activeTab === 'instrument' ? 'panel-slot is-mobile-active' : 'panel-slot'}>
          <InstrumentPanel audition={(note) => void audition(note)} />
        </div>
        <div className={activeTab === 'sequence' ? 'panel-slot is-mobile-active' : 'panel-slot'}>
          <SequencerPanel />
        </div>
        <div className={activeTab === 'code' ? 'panel-slot is-mobile-active' : 'panel-slot'}>
          <CodePanel />
        </div>
      </main>

      <footer className="statusbar">
        <span><i className={audioReady ? 'status-ok' : ''} /> Audio begins only after your gesture</span>
        <span>4 patterns · 4 voices · safe limiter −1 dB</span>
        <span>IndexedDB autosave · no code execution</span>
      </footer>
    </div>
  )
}
