Build the first functional MVP of a beginner-friendly, programmable browser synthesizer with the working title **Violet Signal**.

The product should feel like an instrument from the Blacklight universe: elegant, intimate, neo-noir, slightly haunted, and technologically precise without becoming sterile. Its central idea is:

> Code behaves like musical notation, and every abstraction can be heard.

## First steps

Inspect the repository and any existing instructions before making changes.

* If an application already exists, preserve its architecture and extend it appropriately.
* If the repository is empty, scaffold a modern TypeScript web application using React and Vite.
* Use Tone.js for synthesis, sequencing, timing, and effects.
* Use CodeMirror 6 for the code editor.
* Use a small, lightweight state store such as Zustand if centralized state is useful.
* Keep the audio engine, composition state, parser, and presentation components separate.
* Create a brief implementation plan, then proceed without waiting unless a genuinely product-defining decision or external blocker arises.

The result should be a running vertical slice, not merely a static design prototype.

## Product experience

Create one main workspace containing three synchronized ways of interacting with the same composition:

1. **Instrument**
   Playable pads or a compact keyboard plus the most important sound controls.

2. **Sequence**
   A beginner-readable 16-step sequencer showing notes, active steps, velocity or emphasis, and the current playhead.

3. **Code**
   A constrained declarative music language representing the same composition.

Editing any view must update the others:

* Turning a control updates the composition and generated code.
* Toggling sequencer steps updates the code.
* Editing valid code updates the instrument and sequencer.
* Invalid code must not stop the currently playing composition.
* Display friendly, localized error messages without exposing raw stack traces.
* Apply valid code edits on the next beat or bar so live editing remains musical.

Do not execute arbitrary JavaScript and do not use `eval`, `Function`, or equivalent mechanisms. Implement a small safe parser or constrained data format.

A representative composition could resemble:

```txt
track "Violet Signal" {
  instrument: violet-glass
  notes: C4 Eb4 G4 Bb4
  pattern: x... x.x. ..x. x...
  filter: 2800
  memory: 0.28
  ghost: 0.12
  humanize: 0.03
  overclock: 0.00
}
```

The exact grammar may evolve if another syntax is substantially easier to parse and teach, but it should remain concise, readable, forgiving, and musical. Avoid exposing JSON as the primary creative interface.

## MVP audio system

Implement a musically useful signal chain with Tone.js.

Provide:

* A polyphonic synth voice
* A monophonic bass voice
* A restrained percussion voice
* Tempo control
* Play, pause, and stop controls
* A 16-step transport-synchronized pattern
* Master volume
* Filter cutoff
* Envelope controls
* Delay or “Memory”
* Reverb or “Environment”
* Probability or “Ghost”
* Timing and velocity variation or “Humanize”
* A seeded random source so variations can be reproduced
* Panic or reset-audio control for stuck or unstable audio

All audio must begin only after explicit user interaction, in accordance with browser audio restrictions.

Prevent clicks where practical by ramping parameter changes. Dispose Tone.js nodes and scheduled events correctly during reconfiguration and React development remounts.

## Blacklight sound vocabulary

Present familiar audio concepts through a thematic but understandable architecture:

| Blacklight term | Musical function                            |
| --------------- | ------------------------------------------- |
| Core            | Oscillator or sound source                  |
| Body            | Envelope, velocity, and physical expression |
| Memory          | Delay, repetition, and retained fragments   |
| Mask            | Filter and tonal coloration                 |
| Ghost           | Probability and altered echoes              |
| Environment     | Reverb, room, rain, and distant texture     |

Tooltips or secondary labels should reveal the conventional synthesis term. The fiction should invite beginners inward rather than conceal how synthesis works.

## Signature control: Overclock

Add a prominent **Overclock** macro.

As Overclock rises, it should gradually introduce:

* Brighter harmonics
* More drive
* Slightly tighter envelopes
* Increased rhythmic activity or ghost events
* Controlled pitch or timing instability

At extreme values it may begin to fracture or distort, but it must remain safe for speakers and listeners. Add conservative gain staging and a limiter.

Overclock should have an audible cost. After being pushed hard, let the sound briefly enter an “exhausted” recovery state with reduced brightness or density. Make this effect understandable through the UI rather than hiding it.

## Starter material

Include three editable scenes so the user never opens onto a blank project:

* **Rain Behind Glass** — slow luminous chords, delay, and restrained ambience
* **Static Nerves** — clicks, nervous syncopation, and probabilistic ghost notes
* **Blues on a Black Moon** — worn electric-piano-like harmony with minor jazz extensions

At least one scene should demonstrate chords, one rhythm, and one bass movement.

Do not depend on copyrighted or remotely hosted samples for the MVP. Prefer synthesis and procedurally generated textures. If ambience is included, create it from noise, filtering, delay, and modulation.

## Visual direction

The interface should feel like a sophisticated musical tool, not a cyberpunk game HUD.

Use:

* Near-black charcoal and midnight-violet surfaces
* Muted warm-white text
* Restrained violet and magenta signal highlights
* Occasional amber warning states
* Thin borders and subtle glass reflections
* Soft depth, low bloom, and controlled contrast
* Clear typography and generous spacing
* Smooth, restrained animation tied to musical state

Avoid:

* Neon overload
* Constant glitch effects
* Dense sci-fi decoration
* Tiny unreadable labels
* Generic dashboard cards everywhere
* Fake terminal text
* Excessive gradients

The current step, sounding notes, code selection, and affected control should share a clear visual highlight. A beginner should be able to see which line of code is currently making sound.

Make the desktop experience excellent first, while ensuring the layout remains usable on a tablet or narrow viewport. On small screens, the three views may become tabs.

## Beginner protections

Implement the following where feasible in this vertical slice:

* Preserve the last valid composition when parsing fails.
* Show the exact line containing an error.
* Phrase errors musically, for example: “Pattern has 12 steps; this scene expects 16.”
* Provide undo and redo for composition changes.
* Provide Reset Scene.
* Add a scale lock, enabled by default.
* Show conventional parameter names in tooltips.
* Do not allow unsafe output levels.
* Respect `prefers-reduced-motion`.
* Make controls keyboard-accessible and visibly focused.

## Architecture

Keep these concerns separate:

* Tone.js audio engine and node lifecycle
* Transport and sequence scheduling
* Serializable composition model
* DSL tokenizer/parser and serializer
* Shared application state
* UI components
* Preset or scene definitions

The composition model should be the source of truth. The sequencer, controls, and code editor are projections of that model.

Avoid rebuilding the entire audio graph for every minor UI change. Parameter updates should reach existing audio nodes where possible.

Document important architectural decisions in the README, including:

* How to install and run the project
* Why arbitrary JavaScript is not executed
* How the DSL maps to the composition model
* How synchronization between the three views works
* Known MVP limitations
* Logical next steps

## Testing and verification

Add focused tests for the behavior most likely to break:

* DSL parsing
* Helpful parser errors
* Parse/serialize round trips
* Seeded probability determinism
* Sequencer-to-model synchronization
* Preservation of the last valid state after invalid code
* Overclock parameter mapping and safe output bounds

Run all available type checks, linting, unit tests, and production builds.

If browser automation is available, verify:

* The application loads without console errors.
* Audio can be enabled through a user gesture.
* A scene can be played and stopped.
* Changing a sequencer step updates the code.
* Editing valid code updates the sequencer.
* Invalid code displays an error without destroying the active composition.
* The layout remains usable at desktop and narrow viewport widths.

Audio quality cannot be proven through DOM tests alone. Manually inspect the Tone.js graph, scheduling logic, disposal behavior, and gain staging for obvious problems.

## Scope boundaries

This first milestone does not need:

* User accounts
* Cloud storage
* Collaboration
* Arbitrary JavaScript execution
* Audio-file upload
* MIDI support
* Full DAW functionality
* Multitrack arrangement beyond what the starter scenes require
* Production-quality audio export
* A backend

Prefer a coherent, polished core interaction over adding many unfinished features.

## Done when

The task is complete when:

* The app installs and starts locally.
* A user can enable audio, select a starter scene, and hear it play.
* Instrument controls, sequencer state, and code remain synchronized.
* Valid live-code edits are applied musically.
* Invalid edits preserve the last working composition and produce friendly feedback.
* Overclock produces a clear, controlled transformation and recovery.
* The interface has a distinctive but restrained Blacklight identity.
* Tests, type checking, and production build pass.
* The README explains the project and its architecture.
* You have reviewed the final diff for bugs, stale code, accessibility problems, unsafe audio levels, and accidental scope expansion.

When finished, summarize what was built, identify any compromises, list the validation performed, and suggest the next most valuable milestone.
