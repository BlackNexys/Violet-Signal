import { useEffect, useRef, useState } from 'react'
import { Camera, Download, FileMusic, FolderOpen, Save, Trash2, Upload } from 'lucide-react'
import { renderCompositionToWav } from '../audio/offlineRender'
import { parseComposition } from '../dsl/parser'
import { serializeComposition } from '../dsl/serializer'
import { deleteProject, listProjects, saveProject, type SavedProject } from '../persistence/projects'
import { useAppStore } from '../state/store'

interface ProjectToolsProps {
  startCapture: () => Promise<void>
  stopCapture: () => Promise<Blob | null>
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function ProjectTools({ startCapture, stopCapture }: ProjectToolsProps) {
  const composition = useAppStore((state) => state.composition)
  const loadComposition = useAppStore((state) => state.loadComposition)
  const [projects, setProjects] = useState<SavedProject[]>([])
  const [snapshotName, setSnapshotName] = useState('')
  const [recording, setRecording] = useState(false)
  const [rendering, setRendering] = useState(false)
  const [message, setMessage] = useState('Local autosave active')
  const importRef = useRef<HTMLInputElement>(null)

  const refresh = async () => setProjects((await listProjects()).filter((project) => !project.automatic))
  useEffect(() => { void refresh() }, [])
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void saveProject({ id: 'autosave', name: 'Automatic recovery', updatedAt: Date.now(), composition, automatic: true })
    }, 650)
    return () => window.clearTimeout(timeout)
  }, [composition])

  const saveSnapshot = async () => {
    const name = snapshotName.trim() || `${composition.name} snapshot`
    await saveProject({ id: crypto.randomUUID(), name, updatedAt: Date.now(), composition, automatic: false })
    setSnapshotName('')
    setMessage(`Saved “${name}”`)
    await refresh()
  }
  const loadSnapshot = (id: string) => {
    const project = projects.find((item) => item.id === id)
    if (!project) return
    loadComposition(project.composition)
    setMessage(`Loaded “${project.name}”`)
  }
  const restoreAutosave = async () => {
    const autosave = (await listProjects()).find((project) => project.id === 'autosave')
    if (autosave) { loadComposition(autosave.composition); setMessage('Automatic recovery restored') }
    else setMessage('No automatic recovery yet')
  }
  const exportProject = () => downloadBlob(new Blob([serializeComposition(composition)], { type: 'text/plain' }), `${composition.id || 'violet-signal'}.violet`)
  const importProject = async (file: File | undefined) => {
    if (!file) return
    const result = parseComposition(await file.text())
    if (!result.ok) { setMessage(`Import line ${result.error.line}: ${result.error.message}`); return }
    loadComposition(result.composition)
    setMessage(`Imported ${result.composition.name}`)
  }
  const toggleCapture = async () => {
    if (!recording) { await startCapture(); setRecording(true); setMessage('Live audio capture running') }
    else {
      const blob = await stopCapture()
      setRecording(false)
      if (blob) downloadBlob(blob, `${composition.id || 'violet-signal'}-capture.webm`)
      setMessage('Live capture downloaded')
    }
  }
  const renderWav = async () => {
    setRendering(true)
    setMessage('Rendering arrangement offline…')
    try {
      const blob = await renderCompositionToWav(composition)
      downloadBlob(blob, `${composition.id || 'violet-signal'}-arrangement.wav`)
      setMessage('Offline WAV downloaded · normalized to −1 dBFS')
    } catch {
      setMessage('Offline rendering was not available in this browser')
    } finally {
      setRendering(false)
    }
  }

  return (
    <div className="project-tools">
      <div className="snapshot-create">
        <input value={snapshotName} aria-label="Snapshot name" placeholder="Snapshot name" onChange={(event) => setSnapshotName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void saveSnapshot() }} />
        <button type="button" onClick={() => void saveSnapshot()}><Save size={12} /> Save</button>
      </div>
      <label className="snapshot-load"><FolderOpen size={12} /><select value="" aria-label="Load snapshot" onChange={(event) => loadSnapshot(event.target.value)}><option value="">Snapshots…</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
      <button type="button" title="Restore automatic recovery" onClick={() => void restoreAutosave()}><Camera size={12} /> Recover</button>
      <button type="button" title="Export portable Violet notation" onClick={exportProject}><Download size={12} /> Export</button>
      <button type="button" title="Import a .violet project" onClick={() => importRef.current?.click()}><Upload size={12} /> Import</button>
      <input ref={importRef} className="sr-only" type="file" accept=".violet,.txt,text/plain" onChange={(event) => void importProject(event.target.files?.[0])} />
      <button type="button" className={recording ? 'is-recording' : ''} onClick={() => void toggleCapture()}><span className="capture-dot" /> {recording ? 'Stop capture' : 'Capture'}</button>
      <button type="button" disabled={rendering} title="Render the complete arrangement to a peak-normalized WAV file" onClick={() => void renderWav()}><FileMusic size={12} /> {rendering ? 'Rendering…' : 'WAV'}</button>
      {projects.length > 0 && <button type="button" className="snapshot-delete" title="Delete the newest snapshot" onClick={() => void deleteProject(projects[0].id).then(refresh)}><Trash2 size={11} /></button>}
      <output>{message}</output>
    </div>
  )
}
