# Violet Signal

Violet Signal is a beginner-friendly programmable browser instrument. One composition is projected as a playable synthesizer, a visual pattern/arrangement workspace, and safe declarative notation. Every view edits the same serializable model.

This version expands the original one-bar MVP into a compact composition tool whose data-driven style system can move from ambient and synthpop through club, breakbeat, industrial, retro, dark electronic, experimental, and cinematic vocabularies while retaining its restrained Blacklight identity.

The visual direction is defined in [`project-notes/blacklight-style-guide.md`](project-notes/blacklight-style-guide.md): a “haunted precision” system that translates the reference imagery into accessible interface color, type, hierarchy, state, material, and motion rules.

## Learn inside the instrument

Use **Tutorial** for a seven-step guided walkthrough that points to the real transport, sequencer, keyboard, voice controls, patterns, code, and project tools. It automatically opens the relevant workspace view on narrow screens and can be replayed at any time.

Use **Cheatsheet** for a permanent quick reference covering beat subdivisions, sparse notation, keyboard controls, Blacklight synthesis terms, and project/capture behavior. Tutorial completion is stored locally and only removes the unread indicator.

## Explore and transform the soundverse

Open **Style Lab** to browse 19 built-in recipes, filter them by musical family, blend a secondary influence, choose transformation strength, and explicitly preserve your notes, harmony, timing, arrangement, voices, effects, or tempo. Style application participates in undo/redo and queues safely to the selected boundary during playback. The architecture and extension contract are documented in [`project-notes/style-system.md`](project-notes/style-system.md).

The headline scenes teach four different starting grammars:

- **Veil Communion · Witch house** — 68 BPM half-time weight, cavernous tails, long minor harmony, and damaged haze.
- **Midnight Vector · Darksynth** — driven saw motion, short envelopes, machine pulse, and controlled pressure.
- **Cold Circuit · Darkwave** — cold modulated width, minor chord movement, and restrained drum-machine rhythm.
- **Fractured Broadcast · Glitch** — asymmetric fragments, deterministic chance, reduced bits, and unstable accents.

**Veil · chorus width** and **Fracture · bit reduction** are first-class controls in the Instrument, safe notation, step automation, live engine, and offline WAV renderer. Their bounded mappings and creative rationale are documented in [`project-notes/soundverse.md`](project-notes/soundverse.md).

## Layer instrument sounds

Each of the four voices now has a required **Primary** source and an optional **Shadow** source. Pitched voices can use subtractive, FM, or AM synthesis; Pulse uses membrane or noise synthesis; Texture remains procedural noise. Layer altitude, detune, level, Character, and response scales are explicit composition data and render identically in live playback and offline WAV output.

The first built-in sound packs are **Blacklight Core**, which preserves the original calibrated voices, and **Veil Archive**, which introduces the layered **Glass Choir** chord patch and **Undertow** bass patch. Applying a patch is undoable, queues to the selected musical boundary during playback, and becomes **Custom** after manual sound editing. Sound-pack architecture and extension rules are documented in [`project-notes/instrument-packs.md`](project-notes/instrument-packs.md).

## Run it

Requirements: Node.js 20 or newer and npm.

```bash
npm install
npm run dev
```

Audio remains asleep until **Enable audio**, **Play**, a touch key, or capture is pressed, following browser autoplay rules.

Validation commands:

```bash
npm test
npm run test:cli
npm run lint
npm run build
```

### Validate, format, and render notation from the command line

The production build includes a headless `violet` executable. Validation and formatting reuse the app's bounded parser and canonical serializer without initializing Tone.js or a browser; rendering drives the production offline audio path in a temporary headless-browser session:

```bash
npm run build:cli
node dist-cli/violet.js validate composition.violet
node dist-cli/violet.js validate composition.violet --json
node dist-cli/violet.js format composition.violet --check
node dist-cli/violet.js format composition.violet --write
node dist-cli/violet.js render composition.violet --out composition.wav
```

`format` prints canonical notation by default. `--check` makes no changes and exits `1` when formatting differs; `--write` updates only the named file. `render` requires an installed Google Chrome or Microsoft Edge and produces the same stereo, normalized 44.1 kHz PCM WAV as the app. Set `VIOLET_CHROME_PATH` when the browser is outside its standard installation location. Successful commands exit `0`, notation failures exit `1`, and usage, I/O, browser, or rendering failures exit `2`. Add `--json` to any file command for machine-readable output. When the package is installed through a package manager, its binary name is `violet`.

The reusable production-browser smoke test expects `vite preview` at `http://127.0.0.1:4173`:

```bash
npm run browser:smoke
```

## Musical workflow

### Write a phrase

1. Select pattern A–D.
2. Select a chord or bass cell in the adaptive 8–64-step grid.
3. Press the touch keys or computer keys `A S D F G H J K` to add or remove exact pitches.
4. Use scale-aware chord suggestions for a quick voicing.
5. Choose a note length of 1, 2, 3, 4, or 8 sixteenth-note steps.

The sequencer groups cells according to the selected meter. `/4` beats read `1 e & a`; `/8` beats read `1 &`. Pulse and Texture cells toggle directly. Velocity cycles through three useful emphasis levels, while per-step Chance, Ratchet, and Shift controls add deterministic variation and groove.

### Build an arrangement

Four independent patterns can be appended to an arrangement of up to sixteen occurrences. Select an occurrence to transpose its pitched events, mute voices for that repetition, or focus each voice on all enabled layers, Primary only, or Shadow only. The source pattern remains unchanged, and the transport shows both the sounding pattern and current occurrence. The model and precedence rules are documented in [`project-notes/arrangement-occurrences.md`](project-notes/arrangement-occurrences.md).

Chord, Bass, Pulse, and Texture voices each have Primary and optional Shadow layers plus a shared selectable filter, ADSR envelope, level, mute, and solo settings. Every source is synthesized or procedurally generated; no remote samples are used.

### Add motion and perform

Mask, Memory, Ghost, and Overclock have step-addressed automation lanes. Automation is held from its most recent point until the next point. Temporary **Pressure** and **Freeze Memory** gestures affect performance without rewriting the saved composition.

Arm step recording to place touch/computer-key notes into the currently sounding step. Played notes still audition normally when recording is not armed.

### Keep and capture work

- IndexedDB automatic recovery runs after composition changes.
- Named snapshots can be saved, loaded, and deleted locally.
- `.violet` notation files can be imported and exported.
- Live output can be captured to browser-native WebM audio.
- The complete arrangement can be rendered offline to a stereo 44.1 kHz PCM WAV, peak-normalized to −1 dBFS.

## Safe notation

Violet Signal does not execute JavaScript and never uses `eval`, `Function`, or a general-purpose interpreter. The DSL parses known, bounded musical values into a fresh deterministic composition. Removing a line no longer inherits invisible values from the currently playing scene.

For a complete human- and AI-oriented editing reference—including every accepted value, step-to-beat mapping, a paste-ready scene, troubleshooting, and an AI prompt template—see [`CODE_SECTION_GUIDE.md`](CODE_SECTION_GUIDE.md).

```text
scene "Rain Behind Glass" {
  format-version: 3
  style: darkwave
  style-version: 1
  influences: ambient=0.15
  tempo: 76
  meter: 4/4
  steps: 16
  swing: 0.035
  seed: 2407
  scale: C minor
  lock: on
  patterns: A B C D
  active: A
  arrangement: A A[transpose=12] B[mute=pulse] C[layers=chords:shadow]
  voice chords: triangle volume=-10 cutoff=2550 attack=0.12 decay=0.62 sustain=0.64 release=2.2 mute=off solo=off
  voice bass: triangle volume=-9 cutoff=950 attack=0.012 decay=0.3 sustain=0.5 release=0.7 mute=off solo=off
  memory: 0.42
  environment: 0.34
  veil: 0.56
  fracture: 0.02
  ghost: 0.08
  humanize: 0.018
  overclock: 0
  output: -12

  notes A: 01=C4+Eb4+G4+Bb4~4 05=Ab3+C4+Eb4+G4~4
  bass A: 01=C2~4 05=Ab1~4
  pulse A: 03 07 11 15
  texture A: 03 11
  emphasis A: 03=0.42 05=0.64
  automate mask A: 01=2550 09=3442.5
  automate memory A: none
  automate veil A: 01=0.56 09=0.72
  automate fracture A: 01=0.02 13=0.18
}
```

Sparse assignments make musical positions explicit: `05=C4+Eb4+G4~4` means “play this chord at step 05 for four steps.” The parser also imports the compact `track`, note-palette, and `pattern: x...` teaching syntax from the original MVP brief.

The CodeMirror editor provides syntax coloring, suggestions, formatting, error-line decoration, and active-token highlighting. Parser errors never move the caret automatically; clicking an error explicitly navigates to its line. Valid live-code edits can apply on the next step, beat, or bar, and queued changes are summarized before they sound.

## Architecture

- `src/model/` — serializable composition, patterns, arrangement occurrences, shared transformation resolution, voices, automation, versioned style registry, and starter scenes.
- `src/dsl/` — deterministic parser, sparse serializer, code highlighting ranges, and change summaries.
- `src/state/` — Zustand actions, synchronization, bounded composition undo/redo, selection, recording, arrangement position, and quantized pending edits.
- `src/audio/` — persistent Tone.js graph, Web Audio transport scheduling, frame-synchronized visual updates, shared seeded event/effect mappings, live recorder, and offline WAV rendering. See the [`timing model`](project-notes/timing.md) and [`live/offline rendering model`](project-notes/audio-rendering.md).
- `src/persistence/` — IndexedDB project and automatic-recovery storage.
- `src/components/` — instrument, step editor, arrangement, automation, code editor, project tools, and transport UI.

The audio graph is created only after a user gesture. A shared source factory builds each voice's Primary and Shadow sources for both live and offline contexts. Four voice-specific filter/volume channels feed shared drive, parallel bit reduction, stereo chorus, delay, generated reverb, master compensation, and a hard −1 dB limiter. Parameter changes ramp where Tone exposes signal parameters. One transport callback schedules all four voices, applies automation and seeded variations, advances arrangements, and commits queued code at musical boundaries. Scheduled events and nodes are cleared and disposed on unmount.

## Protections

- Invalid notation preserves the last playable composition and reports an exact line.
- Scale lock begins enabled; custom code remains intentionally unrestricted.
- Composition-level undo/redo and preset reset are independent of CodeMirror text history.
- Output is constrained to −6 dB or quieter before Overclock compensation and final limiting.
- Sustained extreme Overclock enters a visible recovery state with reduced brightness and density.
- Controls are semantic, visibly focusable, and usable from a keyboard.
- Motion respects `prefers-reduced-motion`.
- No copyrighted or remotely hosted samples are required.

## Current limitations

- The musical architecture intentionally remains four voices, four editable patterns, and sixteen arrangement phrases; patterns can contain 8–64 steps.
- Note lengths are gated durations rather than legato ties between changing pitches.
- Offline WAV rendering includes deterministic Ghost/Humanize variation, step automation, and the shared effects graph. Temporary Pressure and Freeze Memory gestures require live capture.
- Live recording format depends on the browser and is currently downloaded as WebM.
- Projects are local to the browser profile; there are no accounts or cloud collaboration.
- MIDI input, stem export, audio-file upload, and full loudness mastering are not included; WAV export performs transparent peak normalization only.

## Next valuable milestone

Add Dorian, Phrygian, harmonic minor, melodic minor, and pentatonic scale modes, then complete the profiling gate for dual, metal, and pluck engines. The adopted sequence—including occurrence rotation, interpolated automation, ties, and per-voice effect sends—is maintained in [`notes/instrument-sound-and-layer-expansion-plan.md`](notes/instrument-sound-and-layer-expansion-plan.md).
