import { useEffect, useRef, useState } from 'react'
import { AudioLines, Download, FileAudio, FolderOpen, Pause, Play, RotateCcw, Save, Zap } from 'lucide-react'
import { ControlSlider } from './ControlSlider'
import { newFxProject, parseFxProject, serializeFxProject, type FxLayer, type FxProject } from '../fx/project'
import { encodeFxWav, fxPeak, renderFxAudio } from '../fx/synthesis'

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const engines: FxLayer['engine'][] = ['noise', 'fm', 'metal']
const layerNames = { transient: 'Transient', body: 'Body', tail: 'Tail' }
const ranges = {
  startMs: [0, 1400, 1],
  durationMs: [10, 1500, 1],
  attackMs: [0, 100, 1],
  frequency: [30, 10000, 10],
  endFrequency: [30, 10000, 10],
  filterHz: [100, 16000, 50],
  levelDb: [-48, 0, 1],
  bits: [4, 16, 1],
} as const

function LayerEditor({ layer, projectMs, onChange }: {
  layer: FxLayer
  projectMs: number
  onChange: (patch: Partial<FxLayer>) => void
}) {
  const update = (key: keyof typeof ranges, value: number) => {
    if (key === 'startMs') {
      const startMs = Math.min(value, projectMs - 10)
      onChange({ startMs, durationMs: Math.min(layer.durationMs, projectMs - startMs),
        attackMs: Math.min(layer.attackMs, Math.min(100, (Math.min(layer.durationMs, projectMs - startMs)) / 2)) })
    } else if (key === 'durationMs') {
      const durationMs = Math.min(value, projectMs - layer.startMs)
      onChange({ durationMs, attackMs: Math.min(layer.attackMs, Math.min(100, durationMs / 2)) })
    } else if (key === 'attackMs') onChange({ attackMs: Math.min(value, layer.durationMs / 2) })
    else onChange({ [key]: value })
  }
  return (
    <section className="fx-layer" aria-label={layerNames[layer.id] + ' layer'}>
      <div className="fx-layer-heading">
        <div>
          <span className="eyebrow">{layer.id}</span>
          <h3>{layerNames[layer.id]}</h3>
        </div>
        <label className="fx-toggle"><input type="checkbox" checked={layer.enabled}
          onChange={(event) => onChange({ enabled: event.target.checked })} /> Enabled</label>
      </div>
      <div className="fx-timeline" aria-hidden="true">
        <span style={{ left: (layer.startMs / projectMs * 100) + '%',
          width: (layer.durationMs / projectMs * 100) + '%' }} />
      </div>
      <label className="fx-engine">Source
        <select value={layer.engine} onChange={(event) => onChange({ engine: event.target.value as FxLayer['engine'] })}>
          {engines.map((engine) => <option key={engine} value={engine}>{engine.toUpperCase()}</option>)}
        </select>
      </label>
      <div className="fx-controls">
        {([
          ['startMs', 'Start', 'milliseconds'],
          ['durationMs', 'Length', 'milliseconds'],
          ['attackMs', 'Attack', 'milliseconds'],
          ['frequency', 'Initial pitch', 'hertz'],
          ['endFrequency', 'Final pitch', 'hertz'],
          ['filterHz', 'Filter', 'hertz'],
          ['levelDb', 'Level', 'decibels'],
          ['bits', 'Fracture', 'bit depth'],
        ] as const).map(([key, label, conventional]) => (
          <ControlSlider key={key} label={label} conventional={conventional} value={layer[key]}
            min={ranges[key][0]}
            max={key === 'startMs' ? projectMs - 10 :
              key === 'durationMs' ? projectMs - layer.startMs :
              key === 'attackMs' ? Math.min(100, layer.durationMs / 2) : ranges[key][1]}
            step={ranges[key][2]}
            format={(value) => key === 'levelDb' ? value + ' dB' :
              key === 'bits' ? value + ' bit' :
              key === 'startMs' || key === 'durationMs' || key === 'attackMs' ? value + ' ms' : value + ' Hz'}
            onChange={(value) => update(key, value)} />
        ))}
      </div>
    </section>
  )
}

/** Optional, self-contained FX editor. Does not mutate Composer state or .violet projects. */
export function FxLab() {
  const [project, setProject] = useState<FxProject>(newFxProject)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('One-shot sound design · project format .violetfx')
  const [playing, setPlaying] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<AudioContext | null>(null)
  const sourcesRef = useRef<AudioBufferSourceNode[]>([])
  const previewVersion = useRef(0)
  const stopTimer = useRef<number | undefined>(undefined)

  const stopPreview = () => {
    previewVersion.current += 1
    for (const source of sourcesRef.current) {
      try { source.stop() } catch { /* Already finished. */ }
    }
    sourcesRef.current = []
    if (stopTimer.current !== undefined) window.clearTimeout(stopTimer.current)
    stopTimer.current = undefined
    setPlaying(false)
  }

  useEffect(() => () => {
    previewVersion.current += 1
    for (const source of sourcesRef.current) {
      try { source.stop() } catch { /* Already finished. */ }
    }
    if (stopTimer.current !== undefined) window.clearTimeout(stopTimer.current)
    void audioRef.current?.close()
  }, [])

  const updateProject = (patch: Partial<FxProject>) => {
    stopPreview()
    setProject((previous) => ({ ...previous, ...patch }))
  }
  const updateDuration = (durationMs: number) => {
    stopPreview()
    setProject((previous) => ({ ...previous, durationMs,
      layers: previous.layers.map((layer) => {
        const startMs = Math.min(layer.startMs, durationMs - 10)
        const layerDuration = Math.min(layer.durationMs, durationMs - startMs)
        return { ...layer, startMs, durationMs: layerDuration,
          attackMs: Math.min(layer.attackMs, 100, layerDuration / 2) }
      }) as FxProject['layers'],
    }))
  }
  const updateLayer = (id: FxLayer['id'], patch: Partial<FxLayer>) => {
    stopPreview()
    setProject((previous) => ({
      ...previous,
      layers: previous.layers.map((layer) => layer.id === id ? { ...layer, ...patch } : layer) as FxProject['layers'],
    }))
  }

  const audition = async (rapid: boolean) => {
    stopPreview()
    // Create / resume the output on the user's gesture before the async offline render.
    const context = audioRef.current && audioRef.current.state !== 'closed'
      ? audioRef.current : new AudioContext()
    audioRef.current = context
    const version = previewVersion.current
    setBusy(true)
    try {
      const [buffer] = await Promise.all([renderFxAudio(project), context.resume()])
      if (version !== previewVersion.current) return
      const start = context.currentTime + 0.02
      const count = rapid ? 5 : 1
      const spacing = rapid ? 0.2 : 0
      for (let i = 0; i < count; i++) {
        const source = context.createBufferSource()
        source.buffer = buffer
        source.connect(context.destination)
        source.start(start + i * spacing)
        sourcesRef.current.push(source)
      }
      setPlaying(true)
      setMessage(rapid ? 'Five shots at 5 Hz · listen for overlapping tails' : 'One-shot preview')
      stopTimer.current = window.setTimeout(() => {
        sourcesRef.current = []
        stopTimer.current = undefined
        setPlaying(false)
      }, Math.ceil((count - 1) * spacing * 1000 + project.durationMs + 70))
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Audio preview unavailable')
    } finally {
      setBusy(false)
    }
  }

  const exportWav = async () => {
    stopPreview()
    setBusy(true)
    try {
      const buffer = await renderFxAudio(project)
      const peak = fxPeak(buffer)
      const name = project.name.trim().replace(/[^a-z0-9_-]+/gi, '-').replace(/^-|-$/g, '') || 'effect'
      download(encodeFxWav(buffer), name + '.wav')
      setMessage('WAV exported · peak ' + (20 * Math.log10(Math.max(peak, 1e-8))).toFixed(1) +
        ' dBFS' + (peak >= 1 ? ' · WARNING: output clips; reduce layer/master levels' : ' · no normalization'))
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'WAV render unavailable')
    } finally { setBusy(false) }
  }

  const importProject = async (file?: File) => {
    if (!file) return
    stopPreview()
    try {
      const content = await file.text()
      const imported = parseFxProject(content)
      setProject(imported)
      setMessage('Imported ' + imported.name)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Import failed')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <section className="fx-lab" aria-label="Violet FX Lab">
      <div className="fx-lab-intro">
        <div><span className="eyebrow">Violet Signal / experimental audio workspace</span>
          <h2><Zap size={22} /> FX Lab</h2>
          <p>Compose a short effect from independent noise, FM and metallic layers. Audition it in context or export a WAV. Your music compositions stay untouched.</p>
        </div>
        <div className="fx-actions">
          <button type="button" onClick={() => { stopPreview(); setProject(newFxProject()); setMessage('Reset to Magenta Snap') }}><RotateCcw size={14} /> Reset</button>
          <button type="button" onClick={() => download(new Blob([serializeFxProject(project)], { type: 'application/json' }),
            (project.name.trim().replace(/[^a-z0-9_-]+/gi, '-') || 'effect') + '.violetfx')}><Save size={14} /> Save project</button>
          <button type="button" onClick={() => fileRef.current?.click()}><FolderOpen size={14} /> Import project</button>
          <input ref={fileRef} type="file" accept=".violetfx,application/json" className="sr-only" onChange={(event) => void importProject(event.target.files?.[0])} />
        </div>
      </div>
      <div className="fx-global-controls">
        <label>Effect name <input value={project.name} maxLength={80} onChange={(event) => updateProject({ name: event.target.value })} /></label>
        <ControlSlider label="Duration" conventional="effect length in milliseconds" min={60} max={1500} step={10}
          value={project.durationMs} onChange={updateDuration} format={(n) => n + ' ms'} />
        <ControlSlider label="Master" conventional="relative output level in decibels" min={-36} max={0} step={1}
          value={project.masterDb} onChange={(masterDb) => updateProject({ masterDb })} format={(n) => n + ' dB'} />
      </div>
      <div className="fx-layers">
        {project.layers.map((layer) => <LayerEditor key={layer.id} layer={layer}
          projectMs={project.durationMs} onChange={(patch) => updateLayer(layer.id, patch)} />)}
      </div>
      <div className="fx-bottom">
        <div className="fx-actions">
          <button type="button" disabled={busy} onClick={() => void audition(false)}><Play size={15} /> Audition</button>
          <button type="button" disabled={busy} onClick={() => void audition(true)}><AudioLines size={15} /> Rapid-fire ×5</button>
          <button type="button" disabled={!playing && !busy} onClick={stopPreview}><Pause size={15} /> Stop</button>
          <button type="button" disabled={busy} onClick={() => void exportWav()}><FileAudio size={15} /> Export WAV</button>
        </div>
        <output role="status">{message}</output>
      </div>
    </section>
  )
}
