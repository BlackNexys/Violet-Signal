import { useState } from 'react'
import { AlignLeft, Braces, Check, Clock3, CornerDownRight, TriangleAlert } from 'lucide-react'
import { summarizeCompositionChange } from '../dsl/serializer'
import type { ApplyQuantization } from '../model/composition'
import { useAppStore } from '../state/store'
import { CodeEditor } from './CodeEditor'

export function CodePanel() {
  const [errorNavigationRequest, setErrorNavigationRequest] = useState(0)
  const code = useAppStore((state) => state.code)
  const composition = useAppStore((state) => state.composition)
  const codeError = useAppStore((state) => state.codeError)
  const activeStep = useAppStore((state) => state.activeStep)
  const playingPatternId = useAppStore((state) => state.playingPatternId)
  const pendingComposition = useAppStore((state) => state.pendingComposition)
  const applyQuantization = useAppStore((state) => state.applyQuantization)
  const setCodeDraft = useAppStore((state) => state.setCodeDraft)
  const formatCode = useAppStore((state) => state.formatCode)
  const setApplyQuantization = useAppStore((state) => state.setApplyQuantization)
  const pendingChanges = pendingComposition ? summarizeCompositionChange(composition, pendingComposition) : []

  return (
    <section className="workspace-panel code-panel" aria-labelledby="code-heading">
      <div className="panel-heading">
        <div><span className="eyebrow">Safe declarative notation</span><h2 id="code-heading">Code</h2></div>
        <Braces size={19} aria-hidden="true" />
      </div>
      <div className="code-toolbar">
        <button type="button" onClick={formatCode}><AlignLeft size={12} /> Format</button>
        <label>Apply <select value={applyQuantization} onChange={(event) => setApplyQuantization(event.target.value as ApplyQuantization)}><option value="step">next step</option><option value="beat">next beat</option><option value="bar">next bar</option></select></label>
      </div>
      {codeError ? (
        <button type="button" className="code-status is-error" onClick={() => setErrorNavigationRequest((value) => value + 1)}>
          <TriangleAlert size={14} /><span>Line {codeError.line}: {codeError.message}</span><CornerDownRight size={12} />
        </button>
      ) : pendingComposition ? (
        <div className="code-status is-pending" role="status" aria-live="polite"><Clock3 size={14} /><span>Queued for the next {applyQuantization}: {pendingChanges.join(', ') || 'scene metadata'}</span></div>
      ) : (
        <div className="code-status" role="status" aria-live="polite"><Check size={14} /><span>Signal in tune · changes are live</span></div>
      )}
      <div className="editor-shell"><CodeEditor value={code} activeStep={activeStep} playingPatternId={playingPatternId} errorLine={codeError?.line ?? null} errorNavigationRequest={errorNavigationRequest} onChange={setCodeDraft} /></div>
      <p className="code-footnote">Steps are explicit: <kbd>05=C4+Eb4+G4~4</kbd> places a four-step chord at step 05. Press <kbd>Ctrl</kbd>+<kbd>Space</kbd> for suggestions.</p>
    </section>
  )
}
