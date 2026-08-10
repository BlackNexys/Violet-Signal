import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, Check, ChevronRight, Clipboard, Keyboard, X } from 'lucide-react'
import { cheatSections, tutorialSteps, type LearningView } from '../learning/content'

interface LearningCenterProps { onViewChange: (view: LearningView) => void }

const TUTORIAL_STORAGE_KEY = 'violet-signal:tutorial-complete'

export function LearningCenter({ onViewChange }: LearningCenterProps) {
  const [tutorialOpen, setTutorialOpen] = useState(false)
  const [cheatsheetOpen, setCheatsheetOpen] = useState(false)
  const [tutorialStep, setTutorialStep] = useState(0)
  const [cheatSection, setCheatSection] = useState(cheatSections[0].id)
  const [copied, setCopied] = useState(false)
  const [completed, setCompleted] = useState(() => localStorage.getItem(TUTORIAL_STORAGE_KEY) === 'true')
  const dialogRef = useRef<HTMLDivElement>(null)
  const cheatDialogRef = useRef<HTMLDivElement>(null)
  const step = tutorialSteps[tutorialStep]
  const selectedCheat = useMemo(() => cheatSections.find((section) => section.id === cheatSection) ?? cheatSections[0], [cheatSection])

  const closeTutorial = () => {
    setTutorialOpen(false)
    document.querySelectorAll('.tutorial-target').forEach((element) => element.classList.remove('tutorial-target'))
  }
  const finishTutorial = () => {
    localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true')
    setCompleted(true)
    closeTutorial()
  }

  const goToTutorialStep = (index: number) => {
    const nextStep = tutorialSteps[index]
    if (nextStep.view) onViewChange(nextStep.view)
    setTutorialStep(index)
  }

  useLayoutEffect(() => {
    if (!tutorialOpen) return
    document.querySelectorAll('.tutorial-target').forEach((element) => element.classList.remove('tutorial-target'))
    const target = document.querySelector(step.selector)
    target?.classList.add('tutorial-target')
    target?.scrollIntoView({ behavior: 'auto', block: 'center' })
    dialogRef.current?.focus({ preventScroll: true })
    return () => target?.classList.remove('tutorial-target')
  }, [step, tutorialOpen])

  useEffect(() => {
    if (!tutorialOpen && !cheatsheetOpen) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (cheatsheetOpen) setCheatsheetOpen(false)
      else closeTutorial()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  })

  useEffect(() => {
    const root = tutorialOpen ? dialogRef.current : cheatsheetOpen ? cheatDialogRef.current : null
    if (!root) return
    const focusable = () => [...root.querySelectorAll<HTMLElement>('button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])')]
    window.requestAnimationFrame(() => (focusable()[0] ?? root).focus())
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      const items = focusable()
      if (!items.length) return
      const first = items[0]
      const last = items.at(-1)!
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    window.addEventListener('keydown', trapFocus)
    return () => window.removeEventListener('keydown', trapFocus)
  }, [cheatsheetOpen, tutorialOpen])

  const openTutorial = () => {
    goToTutorialStep(0)
    setTutorialOpen(true)
  }
  const copyStarter = async () => {
    const starter = `world: darkwave\nveil: 0.48\nfracture: 0.04\nnotes A: 01=C4+Eb4+G4~4 05=Ab3+C4+Eb4~4\nbass A: 01=C2~4 05=Ab1~4\npulse A: 01 05 09 13`
    try {
      await navigator.clipboard.writeText(starter)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  return (
    <>
      <div className="learning-launchers">
        <button type="button" className={!completed ? 'has-unread' : ''} onClick={openTutorial}><BookOpen size={14} /> Tutorial</button>
        <button type="button" onClick={() => setCheatsheetOpen(true)}><Keyboard size={14} /> Cheatsheet</button>
      </div>

      {tutorialOpen && (
        <>
          <div className="learning-shade learning-shade--tutorial" aria-hidden="true" />
          <div className={`learning-backdrop learning-backdrop--tutorial${step.mobileDialog === 'top' ? ' is-top' : ''}`} role="presentation">
            <div ref={dialogRef} className="tutorial-dialog" role="dialog" aria-modal="true" aria-labelledby="tutorial-title" tabIndex={-1}>
              <div className="learning-dialog__topline">
                <span>{step.eyebrow}</span>
                <button type="button" aria-label="Close tutorial" onClick={closeTutorial}><X size={16} /></button>
              </div>
              <div className="tutorial-progress" aria-label={`Tutorial step ${tutorialStep + 1} of ${tutorialSteps.length}`}>
                {tutorialSteps.map((item, index) => <i key={item.id} className={index <= tutorialStep ? 'is-complete' : ''} />)}
              </div>
              <h2 id="tutorial-title">{step.title}</h2>
              <p>{step.body}</p>
              <aside>{step.detail}</aside>
              <div className="tutorial-actions">
                <button type="button" disabled={tutorialStep === 0} onClick={() => goToTutorialStep(tutorialStep - 1)}><ArrowLeft size={14} /> Back</button>
                {tutorialStep < tutorialSteps.length - 1 ? (
                  <button type="button" className="learning-primary" onClick={() => goToTutorialStep(tutorialStep + 1)}>Next <ArrowRight size={14} /></button>
                ) : (
                  <button type="button" className="learning-primary" onClick={finishTutorial}><Check size={14} /> Finish</button>
                )}
              </div>
              <button type="button" className="tutorial-cheat-link" onClick={() => { closeTutorial(); setCheatsheetOpen(true) }}>Open the cheatsheet instead <ChevronRight size={12} /></button>
            </div>
          </div>
        </>
      )}

      {cheatsheetOpen && (
        <>
          <div className="learning-shade" aria-hidden="true" />
          <div className="learning-backdrop" role="presentation">
            <div ref={cheatDialogRef} className="cheatsheet-dialog" role="dialog" aria-modal="true" aria-labelledby="cheatsheet-title" tabIndex={-1}>
              <header>
                <div><span className="eyebrow">Quick reference</span><h2 id="cheatsheet-title">Violet Signal cheatsheet</h2></div>
                <button type="button" aria-label="Close cheatsheet" onClick={() => setCheatsheetOpen(false)}><X size={17} /></button>
              </header>
              <nav aria-label="Cheatsheet sections">
                {cheatSections.map((section) => <button type="button" key={section.id} className={section.id === selectedCheat.id ? 'is-active' : ''} onClick={() => setCheatSection(section.id)}>{section.title}</button>)}
              </nav>
              <div className="cheatsheet-content">
                <div className="cheatsheet-intro"><h3>{selectedCheat.title}</h3><p>{selectedCheat.intro}</p></div>
                <dl>{selectedCheat.items.map((item) => <div key={`${selectedCheat.id}-${item.term}`}><dt>{item.term}</dt><dd>{item.description}{item.example && <code>{item.example}</code>}</dd></div>)}</dl>
              </div>
              <footer>
                <button type="button" onClick={() => void copyStarter()}><Clipboard size={13} /> {copied ? 'Copied starter pattern' : 'Copy starter pattern'}</button>
                <button type="button" className="learning-primary" onClick={() => setCheatsheetOpen(false)}>Done</button>
              </footer>
            </div>
          </div>
        </>
      )}
    </>
  )
}
