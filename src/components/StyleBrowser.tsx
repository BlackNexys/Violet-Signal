import { useEffect, useMemo, useRef, useState } from 'react'
import { Layers3, Search, Sparkles, X } from 'lucide-react'
import {
  DEFAULT_STYLE_PRESERVE,
  STYLE_DEFINITIONS,
  STYLE_FAMILIES,
  type StyleFamily,
  type StylePreserve,
} from '../model/styles'
import { useAppStore } from '../state/store'

interface StyleBrowserProps { open: boolean; onClose: () => void }

const preserveLabels: Array<{ key: keyof StylePreserve; label: string }> = [
  { key: 'patterns', label: 'My notes & rhythm' },
  { key: 'harmony', label: 'Scale & mood' },
  { key: 'arrangement', label: 'Song arrangement' },
  { key: 'tempo', label: 'Tempo' },
  { key: 'timing', label: 'Meter & pattern length' },
  { key: 'voices', label: 'Voice design' },
  { key: 'effects', label: 'Effects' },
]

export function StyleBrowser({ open, onClose }: StyleBrowserProps) {
  const composition = useAppStore((state) => state.composition)
  const applyStyle = useAppStore((state) => state.applyStyle)
  const [selectedId, setSelectedId] = useState(composition.world)
  const [family, setFamily] = useState<StyleFamily | 'all'>('all')
  const [query, setQuery] = useState('')
  const [strength, setStrength] = useState(1)
  const [preserve, setPreserve] = useState<StylePreserve>({ ...DEFAULT_STYLE_PRESERVE })
  const [influenceId, setInfluenceId] = useState('none')
  const [influenceAmount, setInfluenceAmount] = useState(0.25)
  const dialogRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!open) return
    setSelectedId(composition.world)
    setInfluenceId(composition.styleInfluences[0]?.id ?? 'none')
    setInfluenceAmount(composition.styleInfluences[0]?.amount ?? 0.25)
  }, [open, composition.world, composition.styleInfluences])

  useEffect(() => {
    if (!open) return
    dialogRef.current?.focus()
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [open, onClose])

  const styles = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return STYLE_DEFINITIONS.filter((style) => (
      (family === 'all' || style.family === family)
      && (!needle || `${style.label} ${style.family} ${style.tags.join(' ')} ${style.description}`.toLowerCase().includes(needle))
    ))
  }, [family, query])
  const selected = STYLE_DEFINITIONS.find((style) => style.id === selectedId) ?? STYLE_DEFINITIONS[0]

  if (!open) return null

  const confirm = () => {
    const influences = influenceId === 'none' ? [] : [{ id: influenceId, amount: influenceAmount }]
    applyStyle(selected.id, strength, preserve, influences)
    onClose()
  }

  return (
    <div className="style-lab-shade" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section ref={dialogRef} className="style-lab" role="dialog" aria-modal="true" aria-labelledby="style-lab-heading" tabIndex={-1}>
        <header>
          <div><span className="eyebrow">Programmable sound vocabulary</span><h2 id="style-lab-heading">Style Lab</h2></div>
          <button type="button" aria-label="Close Style Lab" onClick={onClose}><X size={17} /></button>
        </header>

        <aside className="style-lab__filters">
          <label className="style-search"><Search size={13} /><input value={query} placeholder="Search sound or mood" onChange={(event) => setQuery(event.target.value)} /></label>
          <nav aria-label="Style families">
            {STYLE_FAMILIES.map((item) => <button type="button" key={item.id} className={family === item.id ? 'is-active' : ''} onClick={() => setFamily(item.id)}>{item.label}</button>)}
          </nav>
          <p>{STYLE_DEFINITIONS.length} built-in recipes. A style is a starting point, never a locked genre.</p>
        </aside>

        <div className="style-lab__list" aria-label="Available styles">
          {styles.length ? styles.map((style) => (
            <button type="button" key={style.id} className={selected.id === style.id ? 'is-active' : ''} onClick={() => { setSelectedId(style.id); if (influenceId === style.id) setInfluenceId('none') }}>
              <span><strong>{style.label}</strong><small>{style.family}</small></span>
              <p>{style.description}</p>
              <i>{style.tags.map((tag) => <em key={tag}>{tag}</em>)}</i>
            </button>
          )) : <p className="style-empty">No style matches that signal.</p>}
        </div>

        <aside className="style-lab__configure">
          <div className="style-readout">
            <Sparkles size={16} />
            <span><small>Selected recipe</small><strong>{selected.label}</strong></span>
          </div>
          <dl>
            <div><dt>Tempo</dt><dd>{selected.tempo.preferred} bpm</dd></div>
            <div><dt>Grid</dt><dd>{selected.timing.meter} · {selected.timing.stepCount} steps</dd></div>
            <div><dt>Swing</dt><dd>{Math.round(selected.timing.swing * 100)}%</dd></div>
          </dl>

          <label className="style-strength"><span>Transformation <output>{Math.round(strength * 100)}%</output></span><input type="range" min={0.1} max={1} step={0.05} value={strength} onChange={(event) => setStrength(Number(event.target.value))} /></label>

          <div className="style-influence">
            <label>Blend one influence<select value={influenceId} onChange={(event) => setInfluenceId(event.target.value)}><option value="none">None</option>{STYLE_DEFINITIONS.filter((style) => style.id !== selected.id).map((style) => <option key={style.id} value={style.id}>{style.label}</option>)}</select></label>
            {influenceId !== 'none' && <label>Influence <output>{Math.round(influenceAmount * 100)}%</output><input type="range" min={0.05} max={0.8} step={0.05} value={influenceAmount} onChange={(event) => setInfluenceAmount(Number(event.target.value))} /></label>}
          </div>

          <fieldset>
            <legend>Keep from this project</legend>
            {preserveLabels.map((item) => <label key={item.key}><input type="checkbox" checked={preserve[item.key]} onChange={(event) => setPreserve((current) => ({ ...current, [item.key]: event.target.checked }))} />{item.label}</label>)}
          </fieldset>
          <p className="style-lab__note">Unchecked parts adopt the recipe. Checked parts stay yours. Changes made during playback land on the selected code boundary.</p>
          <button type="button" className="style-apply" onClick={confirm}><Layers3 size={14} /> Apply {selected.label}</button>
        </aside>
      </section>
    </div>
  )
}
