# Instrument Sound and Layer Expansion Plan

Status: completed — all 10 delivery steps shipped
Date: 2026-08-19  
Last planning update: 2026-08-20
Last implementation update: 2026-08-20

## Implementation progress

The first vertical slice is implemented:

- Format-v2 Primary/Shadow voice data and idempotent legacy migration.
- Shared live/offline sources for subtractive, FM, AM, dual, pluck, membrane, metal, and noise engines.
- Blacklight Core, Veil Archive, Chrome Wound, and the first Fractured Relay patches.
- Patch selection, editable layer controls, Custom provenance, undo/redo, and queued playback-boundary application.
- Safe notation, CodeMirror support, IndexedDB/project normalization, documentation, and production-browser layered WAV coverage.

The headless CLI is implemented with validation, formatting, and production-path WAV rendering. Format v3 arrangement occurrences provide transpose, whole-memory rotation, per-voice mute, Primary/Shadow selection, and bounded effect modifiers. Dorian, Phrygian, harmonic minor, melodic minor, and pentatonic share one interval registry across notation, keyboard choices, and chord suggestions. Dual and metal sources plus a bounded managed pluck pool run through the shared live/offline adapter; Chrome Wound and Fractured Relay patches exercise them in production-browser WAV coverage. Hold/Linear automation shares one circular resolver across lane previews, live playback, offline WAV rendering, and occurrence effects. Explicit Chord/Signal/Bass ties use shared attack, pitch-change, and release lifecycles across live and offline rendering. Per-voice Fracture, Veil, Memory, and Environment sends feed a shared parallel graph built by the same live/offline routing factory. Format v4 completes the roadmap with a fifth monophonic Signal voice, an independent opt-in note lane, three built-in patches, full occurrence controls, and live/offline parity.

## Post-v2 feedback roadmap

Composition feedback exposed a broader opportunity than sound expansion alone: patterns currently define **what** happens and the arrangement defines **when**, but each occurrence cannot yet define **what happens differently this time**. That missing middle layer should become a signature part of Violet Signal.

The adopted priorities are:

| Priority | Capability | Product value | Main constraint |
| --- | --- | --- | --- |
| 1 | Headless validation and formatting CLI | Makes notation dependable in scripts, editors, CI, and AI-assisted workflows | Keep diagnostics stable and machine-readable |
| 2 | Arrangement-instance transformations | Highest compositional differentiation and reuse | Requires a carefully migrated occurrence model and defined automation precedence |
| 3 | Additional scale modes | Immediate musical range at relatively low implementation risk | Preserve unrestricted note entry |
| 4 | Complete `dual`, `metal`, and `pluck` engines | Fulfils the sound-expansion vocabulary, especially short plucked articulation | Profile polyphony and offline parity first |
| 5 | Interpolated automation and real ties | Adds motion and expressive glide | Requires shared automation and source-lifecycle semantics |
| 6 | Per-voice effect sends | Makes layers occupy different depths without duplicating processors | Requires a parallel-bus graph rather than fields on the current serial chain |
| 7 | Fifth melodic Signal voice | Adds a dedicated lead role | Completed after the preceding models settled; format v4 migration keeps its lane empty |

### Guiding decisions

- Preserve the existing pattern editor: occurrence transformations add arrangement-level expression rather than duplicate pattern data.
- Keep transformations explicit, bounded, deterministic, serializable, and identical in live and offline playback.
- Establish one shared resolution path for playback, offline rendering, UI summaries, and future CLI inspection.
- Do not let occurrence transforms mutate their source patterns.
- Keep old arrangements valid by migrating each pattern id to an occurrence with neutral transforms.
- Treat per-voice sends as a routing feature, not as separate effect instances or per-layer effect chains.
- Keep unrestricted chromatic entry available when adding scale modes.

## Milestone A — Headless CLI foundation

Status: completed 2026-08-20, including headless-browser `render`.

The first deliverable is a small executable surface over the existing pure parser and serializer:

```text
violet validate <input.violet> [--json]
violet format <input.violet> [--check | --write]
violet render <input.violet> --out <output.wav>
```

`validate` and `format` do not initialize Tone.js or require a browser. `render` loads its browser dependency only after the input has parsed successfully.

### CLI contract

- Human-readable diagnostics are the terminal default.
- `--json` returns a stable document such as `{ "ok": false, "diagnostics": [...] }`.
- Each diagnostic includes a stable code, message, line when available, and a short source excerpt when useful.
- Exit `0` means success, exit `1` means invalid composition or failed format check, and exit `2` means invalid CLI usage or an unexpected runtime failure.
- `format --check` never writes and is appropriate for CI.
- `format --write` uses canonical serialization and changes only the explicitly named file.
- Standard input/output support may follow after the file contract is stable.

`render` drives the existing production-browser renderer through headless Chrome or Edge because the Node runtime does not provide a native `OfflineAudioContext`. The browser worker is packaged beside the Node executable, uses a loopback-only server, and saves the WAV download without transferring its bytes through the browser automation protocol. A native Node audio backend should only be considered later if its maintenance and parity cost is justified.

Exit criteria:

- Valid and invalid fixtures produce deterministic output and exit codes.
- Canonical files pass `format --check`; non-canonical files fail without modification.
- JSON diagnostics are covered as a compatibility surface.
- CLI behavior works outside the repository checkout after packaging.

## Milestone B — Arrangement occurrence foundation

Status: completed 2026-08-20.

Replace `PatternId[]` as the persisted arrangement concept with explicit occurrences. Exact TypeScript names may change, but the model should resemble:

```ts
interface ArrangementOccurrence {
  pattern: PatternId
  transpose: number
  rotate: number
  mute: VoiceId[]
  layers: Partial<Record<VoiceId, 'all' | 'primary' | 'shadow'>>
  effects: Partial<Record<AutomationTarget, number>>
}
```

Every field must have a neutral value so legacy entries migrate without audible change:

- `transpose: 0`
- `rotate: 0`
- `mute: []`
- missing layer selections mean `all`
- missing effect modifiers mean no change

### Resolution semantics

Use this precedence everywhere:

```text
pattern data and automation
    -> arrangement-occurrence transformation
    -> live performance gesture
    -> bounded audio safety mapping
```

Initial implementation scope:

1. Transpose pitch-bearing Chord, Signal, and Bass events by bounded semitones.
2. Mute any voice for one occurrence without changing its pattern or global voice state.
3. Select all, Primary-only, or Shadow-only output for a voice in one occurrence.
4. Add rotation after its precise semantics are tested. **Completed.**
5. Add effect modifiers only after their interaction with automation is represented by the shared resolver. **Completed.**

Rotation should rotate the whole pattern memory, including its automation lanes. Splitting event rotation from automation rotation can be a later explicit feature; it must not happen accidentally. A rotated occurrence resolves virtual step indices and never rewrites the source pattern.

Effect transformations should be bounded modifiers rather than hidden replacement values. The resolver must document whether each modifier is an offset or multiplier and clamp only at the final safety-mapping stage. This preserves the audible contribution of pattern automation.

### Adopted notation

Arrangement occurrences use format v3 and a compact inline form:

```text
arrangement: A A[transpose=12,rotate=-3] B[mute=pulse,effects=memory:0.25] C[layers=chords:shadow,effects=mask:1.5]
```

The chosen grammar provides:

- readable diffs;
- friendly line-specific errors;
- unambiguous whitespace and list parsing;
- canonical formatting;
- room for layer selection and effect modifiers without making one line opaque.

Neutral occurrences remain bare letters. Canonical formatting orders fields as transpose, rotate, mute, layers, then effects; format-v4 voice lists use Chord, Signal, Bass, Pulse, Texture order and effect lists use Mask, Memory, Veil, Fracture, Ghost, Overclock order. Rotation accepts `-63..63` whole steps. Mask is a `0.25..4` multiplier; the other effect values are `-1..1` offsets applied after pattern automation.

Exit criteria:

- Legacy arrangements migrate idempotently and sound unchanged.
- Occurrences round-trip through notation, persistence, undo/redo, and project normalization.
- Sequencer summaries make transformed occurrences distinguishable without overcrowding the arrangement strip.
- Live and offline event plans resolve the same notes, steps, layers, mutes, and modifiers.

## Milestone C — First expressive transformations

Status: completed 2026-08-20.

Ship the occurrence model through a musically complete vertical slice:

- transpose;
- per-occurrence voice mute;
- per-occurrence Primary/Shadow selection;
- arrangement editing UI and readable summaries;
- notation and migration;
- live and offline parity;
- deterministic tests covering loops, Ghost, Chance, ratchets, and Overclock.

The completed follow-on rotates steps, expressions, and automation as one virtual memory, then applies bounded effect modifiers through the shared live/offline sequencer resolver without mutating the source pattern.

## Milestone D — Scale and engine vocabulary

Status: completed 2026-08-20.

Add Dorian, Phrygian, harmonic minor, melodic minor, and pentatonic modes while retaining major, minor, and unrestricted entry. Scale helpers, parser validation, UI choices, style recipes, transposition, and tests must use the same interval definitions.

Resume the sound-engine profiling gate for:

- `dual` for wide detuned Chord, Signal, and Bass patches;
- `metal` for Pulse and Texture transients;
- `pluck`, with managed polyphony and lifecycle tests, as the most compositionally important addition.

This milestone completes Chrome Wound before expanding Fractured Relay and Low Cinema.

## Milestone E — Automation interpolation and ties

Status: Hold/Linear interpolation and true ties completed 2026-08-20.

Automation should progress from the current held-value lanes to explicit interpolation modes:

- **Hold** preserves current behavior and migration compatibility.
- **Linear** interpolates between authored points.
- **Ease** remains optional until Hold and Linear are audible, deterministic, and understandable in the editor.

The implemented pure automation resolver is used by the live engine, offline renderer, UI previews, and occurrence-effect resolution. Missing persisted modes migrate to Hold. Linear values interpolate at each step and continue through the final-to-first loop segment; empty lanes use the global fallback and one-point lanes remain constant. Canonical notation omits default Hold and adds `linear` after the pattern id when selected.

Real ties use `>` as an explicit outgoing connection and source adapters expose attack, pitch change, and release lifecycles rather than encoding ties as unusually long gates. The shared decision model continues eligible authored events across pattern and occurrence boundaries, preserves the terminal event's authored gate unless a new note replaces it, and releases on rests, mute, failed Chance, Ghost substitution, ratchets, pause, stop, panic, and offline completion. Engine/layer replacement releases the old source and retires it after its tail. Mono compatible engines preserve Glide; Chords retain common tones; physical plucks re-excite only changed strings.

## Milestone F — Per-voice effect sends

Status: completed 2026-08-20.

The implemented graph forks each complete filtered voice into a trimmed dry bus and four bounded sends:

```text
voice channels -> dry bus ---------------------------------> output
              -> Fracture send -> shared Fracture return --|
              -> Veil send ----> shared Veil return -------|
              -> Memory send --> shared Memory return -----|
              -> Environment --> shared Environment return-|
```

Global effect controls continue to shape the shared processors and returns; per-voice send values control how much Chord, Signal, Bass, Pulse, and Texture enter each processor. Missing sends on legacy voices normalize to `1`, while the new Signal role uses a calibrated depth map. A unity dry branch, `0.72` send-input trim, dynamic compensation for the nominal dry-plus-return sum, and the final limiter protect the parallel graph. Drive moved after the compensated returns, so this retains routing intent rather than attempting to reproduce every interaction from the former serial chain. Memory's dotted-eighth delay derives from project BPM in both live and offline playback.

One routing factory now instantiates the graph for live playback and offline WAV rendering. The Instrument exposes the sends as the selected voice's **Depth** controls, canonical notation writes `send-fracture`, `send-veil`, `send-memory`, and `send-environment`, and sound-patch selection preserves these routing choices. Unit, production build, live browser, and offline-WAV coverage validate gain staging, feedback safety, mute/solo behavior, automation, disposal, and renderer parity.

## Milestone G — Signal voice

Status: completed 2026-08-20.

Signal receives its own monophonic pattern lane with the same `1`, `2`, `3`, `4`, and `8` step gates and explicit `>` tie lifecycle as Bass. It supports subtractive, FM, AM, dual, and managed-pluck sources; Primary/Shadow layers; Glide; mute/solo; occurrence transpose, mute, and layer focus; per-voice effect sends; live audition; recording; and deterministic offline WAV rendering.

Format v4 is the compatibility boundary. v1–v3 compositions normalize a calibrated Signal channel plus an empty Signal event on every step, so their sound is unchanged. Existing Style recipes neither generate Signal phrases nor overwrite an authored one. Signal therefore participates only when explicitly authored. Carrier Line, Cold Beacon, and Needle Light seed the role across Blacklight Core, Veil Archive, and Fractured Relay.

## Revised delivery sequence

1. **Completed:** Package `violet validate` and `violet format` with stable diagnostics.
2. **Completed:** Specify format-v3 arrangement occurrences and build the shared occurrence resolver.
3. **Completed:** Ship transpose, occurrence mute, and Primary/Shadow selection end to end.
4. **Completed:** Add headless-browser `violet render` and verify the packaged WAV path.
5. **Completed:** Add scale modes and complete dual, metal, and pluck profiling and patches.
6. **Completed:** Add occurrence rotation and bounded effect modifiers.
7. **Completed:** Add Hold/Linear automation interpolation.
8. **Completed:** Add true ties and legato source lifecycles.
9. **Completed:** Refactor the effect graph and expose per-voice sends.
10. **Completed:** Add the format-v4 Signal voice after validating an independent, opt-in lane against the settled models.

## Outcome

Expand Violet Signal from four fixed synth voices into five richer, layered instruments while keeping the sequencer's mental model bounded and beginner-friendly.

The recommended design is:

- Keep the existing **Chord, Bass, Pulse, and Texture** lanes and add one explicit monophonic **Signal** lead lane after the shared models settle.
- Give each voice a **Primary** layer and one optional **Shadow** layer.
- Add a small set of synthesis engines already available in the installed `tone` package.
- Package authored combinations as versioned, built-in **sound packs** that fit the Blacklight theme.
- Keep every concrete sound setting serialized so a saved composition does not change when a pack evolves.
- Preserve deterministic playback, old project compatibility, and live/offline WAV parity.

This creates meaningfully deeper sound without turning Violet Signal into a full DAW; Signal is the one deliberately scoped lane expansion.

## Why this direction fits the current app

The repository already has a broad musical vocabulary, but a narrow synthesis vocabulary:

| Area | Current state | Consequence |
| --- | --- | --- |
| Musical lanes | Five semantic voices: Chord, Signal, Bass, Pulse, Texture | Signal adds a clear lead role without arbitrary track creation. |
| Sound sources | One Tone.js instrument per lane | Styles can change parameters, but often retain a similar underlying timbre. |
| Oscillators | Sine, triangle, square, saw; Texture maps these to noise colors | Useful fundamentals, but not enough for clearly distinct instruments. |
| Effects | Drive, bit reduction, chorus, delay, generated reverb, limiter | The shared Blacklight character is already strong. |
| Style recipes | 19 built-in genre/style recipes | Styles are broad enough; deeper source sounds will make them more convincing. |
| Rendering | Separate live and offline graphs with shared pure mappings | New sources must be implemented in both paths or extracted into shared builders. |
| Notation | Five explicit `voice` lines using bounded values | New sound data must remain safe, readable, and backward compatible. |

Relevant implementation seams are `src/model/composition.ts`, `src/model/styles.ts`, `src/audio/engine.ts`, `src/audio/offlineRender.ts`, `src/dsl/parser.ts`, `src/dsl/serializer.ts`, and `src/components/InstrumentPanel.tsx`.

## Product principles

1. **Bounded depth before breadth.** Existing notes and steps trigger richer instruments; the later Signal lane is one explicit lead role, not an arbitrary track system.
2. **Two layers are enough.** A fixed Primary/Shadow pair is expressive, explainable, and bounded for CPU use.
3. **Patches are starting points, not locks.** Applying a sound changes explicit settings that remain editable.
4. **Theme in names, clarity in labels.** “Glass Choir” may be the patch name; “wide AM pad” explains what it does.
5. **No sample dependency in the first release.** Keep sounds procedural, offline-renderable, and free of asset/licensing concerns.
6. **One composition, one truth.** Visual controls, notation, project persistence, styles, live playback, and WAV output must agree.
7. **Old signals still sound like themselves.** Existing projects migrate to a single enabled Primary layer that reproduces the current voice.

## Proposed sound model

### Keep the original roles and add one bounded lead

The original two-layer slice required no new step lanes. The later format-v4 milestone adds one deliberately bounded monophonic Signal lane; Chord remains polyphonic, Signal and Bass are mono, and Pulse and Texture retain hit events.

```text
Sequencer event
    -> Voice (Chord / Signal / Bass / Pulse / Texture)
        -> Primary layer
        -> optional Shadow layer
    -> shared voice filter and level
    -> dry + four per-voice sends -> shared parallel returns -> Drive -> Limiter
```

Mute, solo, automation, the voice filter, and the voice level continue to operate at voice/channel level. Layer controls define how the sound is generated before it enters that channel.

### Layer limits

Each voice has exactly two addressable slots:

- **Primary** is always enabled and replaces the current single source.
- **Shadow** is optional and defaults to disabled for migrated compositions.

Do not support arbitrary layer arrays in the first version. A fixed pair keeps serialization readable, avoids reorder semantics, limits polyphony, and gives the UI stable controls.

### Engine vocabulary

Use engine capabilities already shipped by Tone.js 15.1.22. The UI should show the thematic name followed by a conventional explanation.

| Engine id | UI label | Tone building block | Compatible roles | Character |
| --- | --- | --- | --- | --- |
| `subtractive` | Signal — classic synth | `Synth` / `MonoSynth` | Chord, Signal, Bass | Familiar analog-like base; migration default. |
| `fm` | Specter — FM | `FMSynth` | Chord, Signal, Bass | Bells, glass, growl, and digital edge. |
| `am` | Halo — AM | `AMSynth` | Chord, Signal, Bass | Hollow, vocal, and slowly moving tones. |
| `dual` | Twin — dual oscillator | `DuoSynth` | Chord, Signal, Bass | Wide detuned stacks and unstable unison. |
| `pluck` | Wire — physical pluck | `PluckSynth` or a small managed voice pool | Chord, Signal, Bass | Short wire, string, and picked transients. |
| `membrane` | Impact — membrane | `MembraneSynth` | Pulse | Current kick/tom foundation. |
| `metal` | Shard — metallic | `MetalSynth` | Pulse, Texture | Hats, clangs, relays, and industrial accents. |
| `noise` | Weather — noise | `NoiseSynth` | Pulse, Texture | Brown, pink, or white noise bodies. |

Engine compatibility should be enforced in the model, parser, UI, and pack validator. Unsupported combinations must never reach the audio graph.

### Common layer controls

Expose a compact common vocabulary rather than every Tone.js engine option:

| Control | Suggested bound | Purpose |
| --- | --- | --- |
| `engine` | compatible engine id | Selects the synthesis model. |
| `waveform` | existing four waveforms | Defines carrier/core shape where meaningful; maps to noise color for noise. |
| `octave` | `-2` to `2`, whole numbers | Separates layers musically without editing notes. |
| `detune` | `-100` to `100` cents | Adds drift or intentional beating. |
| `level` | `-36` to `0` dB relative | Sets layer balance before the voice channel. |
| `character` | `0` to `1` | Bounded engine-specific macro such as FM index, AM harmonicity, pluck resonance, or metal brightness. |
| `attackScale` | `0.25` to `4` | Lets a Shadow arrive before or after the Primary while retaining the voice ADSR. |
| `releaseScale` | `0.25` to `4` | Lets a layer leave a short edge or long afterimage. |
| `enabled` | on/off | Applies to Shadow; Primary remains on. |

`character` needs pure mapping functions with named constants and unit tests. It must not be a direct unbounded pass-through into Tone.js.

### Draft model shape

The exact TypeScript naming can change during implementation, but the persisted concept should resemble:

```ts
type LayerSlot = 'primary' | 'shadow'
type InstrumentEngine =
  | 'subtractive' | 'fm' | 'am' | 'dual' | 'pluck'
  | 'membrane' | 'metal' | 'noise'

interface VoiceLayerSettings {
  enabled: boolean
  engine: InstrumentEngine
  waveform: Waveform
  octave: number
  detune: number
  level: number
  character: number
  attackScale: number
  releaseScale: number
}

interface VoiceSettings {
  patchId: string | null
  layers: Record<LayerSlot, VoiceLayerSettings>
  cutoff: number
  attack: number
  decay: number
  sustain: number
  release: number
  filterType: FilterType
  resonance: number
  glide: number
  volume: number
  mute: boolean
  solo: boolean
}
```

The existing `core` and `detune` values migrate into the Primary layer. Existing voice filter, envelope, glide, channel level, mute, and solo settings keep their current meaning.

## Sound packs

### Package strategy

“Sound packs” should be an internal, versioned data registry similar to the existing style registry. They are not new npm packages and do not execute code.

No additional runtime dependency is recommended for the first release. React, Zustand, and Tone.js already cover the required UI, state, synthesis, and rendering work. Avoid Tone `Sampler` and remote audio until there is a separate asset, license, loading, caching, and offline-render policy.

Suggested registry concepts:

```ts
interface SoundPackDefinition {
  id: string
  version: number
  label: string
  description: string
  tags: string[]
  patches: InstrumentPatchDefinition[]
}

interface InstrumentPatchDefinition {
  id: string
  label: string
  conventionalDescription: string
  role: VoiceId
  settings: Partial<VoiceSettings>
}
```

Stable identity can use `pack-id/patch-id@version`. Applying a patch copies its concrete bounded settings into the composition. The id remains provenance for the UI, not a runtime lookup required to reproduce the sound. Editing any copied setting marks it **Custom** while retaining the concrete data.

### Proposed built-in catalog

The names carry atmosphere; each UI entry must also include the plain-language descriptor shown here.

| Pack | Chord patch | Signal patch | Bass patch | Pulse patch | Texture patch |
| --- | --- | --- | --- | --- | --- |
| **Blacklight Core** | Quiet Circuit — classic poly synth | Carrier Line — gliding mono lead | Underline — mono synth | Heart Signal — membrane hit | Rain Carrier — filtered noise |
| **Veil Archive** | Glass Choir — AM/FM pad | Cold Beacon — glassy AM/FM lead | Undertow — sine/FM sub | Ritual Knock — deep layered membrane | Wet Glass — pink/brown noise wash |
| **Chrome Wound** | Razor Assembly — detuned dual saw | — | Reactor — FM/subtractive growl | Iron Pulse — membrane and metallic attack | Arc Ash — bright metallic/noise debris |
| **Fractured Relay** | Bit Apparition — square/FM keys | Needle Light — physical-string lead | Wire Below — short physical pluck | Relay Click — clipped metal transient | Data Dust — gated white-noise fragments |
| **Low Cinema** | Eclipse Bloom — slow dual/AM pad | — | Low Omen — layered sine drone | Distant Impact — softened membrane boom | Black Snow — long dark noise bed |

The initial delivery should include **Blacklight Core**, **Veil Archive**, and **Chrome Wound**: four migrated patches plus eight genuinely new patches. Fractured Relay and Low Cinema form the second content slice after performance and live/offline parity are proven.

### Relationship to styles

Styles and sound packs remain separate:

- A **style** can change tempo, timing, harmony, patterns, arrangement, voices, and effects.
- A **sound patch** changes one voice's synthesis and channel settings only.
- A **sound pack** groups related patches; it never changes notes or rhythm.

Style definitions may reference recommended patch ids in their voice recipes. The existing **Preserve voice design** switch must preserve the full layered voice configuration. Applying a style writes explicit values, so a later pack update cannot silently alter an existing composition.

## Instrument interface

### Patch selection

Add a compact **Sound** selector above the existing Core block for the selected voice:

- Browse by pack and voice-compatible patch.
- Show patch name, conventional description, and two or three character tags.
- Apply immediately when stopped, or through the existing queued musical-boundary behavior while playing.
- Offer **Reset patch** separately from the existing scene/style reset behavior.
- Show **Custom** after a user changes a sound-defining value.

Patch browsing should live in the Instrument workspace, not in the sequencer. A drawer or restrained popover is preferable to adding twenty permanent buttons.

### Layer rack

Replace the single-source “Core” presentation with one calibrated module:

- Primary and Shadow rows with an explicit on/off state for Shadow.
- Engine, waveform/color, octave, drift, level, and Character.
- The existing Mask/Focus filter and Body ADSR remain voice-level controls below the layer rows.
- Detailed layer response scales can live in an **Advanced** disclosure; patches can set them even when collapsed.
- Audition plays the fully layered selected voice.

Do not use a different bright color for every engine. Follow the Blacklight system: violet for selected/live state, data-cool sparingly for layer linkage, amber for a pending engine rebuild, and red only for failure or destructive state.

### Beginner language

Use thematic terms with conventional sublabels:

- **Shadow** — second sound layer
- **Character** — engine tone
- **Altitude** — octave shift, if the conventional “Octave” label remains visible
- **Drift** — detune
- **Body** — envelope
- **Mask / Focus** — filter cutoff / resonance

The selected patch description should explain the audible result rather than expose implementation details.

## Safe notation and persistence

### Versioning

Introduce a composition/format version distinct from the existing style recipe version. Local IndexedDB projects and `.violet` files need the same migration path.

- Missing format version means legacy v1.
- v1 voices migrate to the role's current engine as Primary plus a disabled Shadow.
- v2 serializes both layer slots explicitly.
- Parsing an old v1 scene should serialize to canonical v2 after it is accepted.
- Never use `style-version` as the composition schema version.

### Draft notation

Keep the current voice line recognizable and add explicit layer lines. One possible canonical form is:

```text
format-version: 2
patch chords: veil-archive/glass-choir@1
voice chords: sawtooth engine=am filter=lowpass cutoff=2400 resonance=1.2 volume=-12 attack=0.35 decay=0.9 sustain=0.7 release=3.4 glide=0 mute=off solo=off
layer chords shadow: on engine=fm waveform=sine octave=1 detune=7 level=-16 character=0.42 attack-scale=1.6 release-scale=1.25
```

Final grammar should follow these rules:

- Existing v1 `voice` lines remain accepted unchanged.
- Unknown engines, incompatible role/engine pairs, and out-of-range layer controls return friendly line-specific errors.
- `patch` is descriptive provenance; explicit voice/layer values are the sound source of truth.
- Canonical serialization always includes the Shadow line, even when it is off.
- Editor completion, syntax highlighting, formatting, change summaries, the Code guide, and parser tests ship together.

## Audio architecture

### Shared source adapters

Do not add another set of engine-specific branches independently to both renderers. Introduce a shared source abstraction used by the live and offline graph builders.

Suggested modules:

- `src/audio/instrumentMappings.ts` — pure bounded Character and layer mappings.
- `src/audio/instrumentSource.ts` — typed adapter interface for update, trigger, release, and dispose.
- `src/audio/instrumentFactory.ts` — creates Tone source adapters by engine and role.
- `src/audio/voiceGraph.ts` — creates the two layers, layer gains, and shared voice filter/channel.
- `src/model/instrumentPacks.ts` — validated built-in pack and patch registry.
- `src/model/migrations.ts` — explicit persisted-composition migrations.

Live and offline rendering still create their own Tone nodes in the active Tone context, but they share:

- engine option mapping;
- event-to-trigger mapping;
- pitch transposition;
- layer gain and envelope scaling;
- compatibility checks;
- gain staging constants;
- disposal behavior and source metadata.

### Runtime changes

Numeric edits should ramp smoothly. Changing an engine usually requires node replacement; queue that replacement to the existing selected musical boundary, crossfade briefly if practical, then dispose the old node. Avoid rebuilding the whole graph for waveform, level, detune, or Character changes when the Tone source can update safely.

All layer nodes and temporary crossfade gains must be tracked and disposed on panic/unmount. Tests should detect repeated engine switching that leaks graph objects or schedules duplicate triggers.

### Gain and polyphony budget

Layering must not simply double loudness.

- Add a conservative per-layer trim before the voice channel.
- Default Shadow level should sit clearly below Primary.
- Preserve the current input trim, output compensation, and hard `-1 dB` limiter.
- Cap pitched polyphony across both Chord layers; begin with a total budget comparable to the current maximum rather than doubling it blindly.
- Drop oldest release tails before current attacks when the cap is reached.
- Exercise maximum chord size, ratchet count, long releases, Overclock, and both layers during profiling.

## Delivery plan

### Phase 0 — Sound and CPU spike

- Prototype `subtractive`, `fm`, `am`, `dual`, `membrane`, `metal`, and `noise` adapters outside the UI.
- Confirm which engines update without reconstruction and which require replacement.
- Test two-layer chords at maximum practical chord size and ratchets in current supported browsers.
- Decide whether `pluck` meets polyphony, lifecycle, and offline parity requirements; defer it if a managed pool is not reliable.
- Tune initial engine mappings and layer trim using normalized loudness comparisons, not peak alone.
- Keep live monitoring practical with a bounded post-mix boost and engine-aware AM/FM compensation; do not bake monitor calibration into composition values or normalized WAV output.

Exit: an engine compatibility matrix, CPU/polyphony budget, and four approved representative sounds.

### Phase 1 — Model, migration, and pack registry

- Add format versioning and Primary/Shadow layer types.
- Implement one idempotent v1-to-v2 migration for local projects and parsed notation.
- Add compatible-engine validation and bounded defaults per voice role.
- Build the sound-pack registry with Blacklight Core, Veil Archive, and Chrome Wound.
- Add pure patch application that participates in composition undo/redo and boundary queuing.
- Extend style recipes and Preserve voice design behavior to carry layered voices.

Exit: all old fixtures migrate; all pack definitions validate; patch application is deterministic and serializable.

### Phase 2 — Shared audio graph and live playback

- Implement the source adapters, factory, and two-layer voice graph.
- Route both layers through the existing voice filter/level and shared effects.
- Update audition, sequencer triggering, mute/solo, automation, panic, and disposal.
- Add safe engine replacement at musical boundaries.
- Verify Ghost, Chance, ratchets, Humanize, Pressure, Freeze Memory, and Overclock still behave as designed.

Exit: all twelve initial patches play live without clicks, stuck notes, duplicate scheduling, or graph leaks.

### Phase 3 — Offline WAV parity

- Create offline voices through the same factories and mappings.
- Ensure deterministic scheduling, layer pitch offsets, Character mappings, and layer gains match live playback.
- Retain stereo 44.1 kHz WAV output and peak normalization.
- Add automated render assertions for silence, finite samples, channel count, peak ceiling, duration, and deterministic output.
- Perform listening comparisons for every initial patch and representative automation/Overclock cases.

Exit: every supported engine and initial patch renders; no patch is live-only.

### Phase 4 — Instrument UI

- Add the voice-compatible patch browser and Custom state.
- Add the Primary/Shadow layer rack with restrained advanced controls.
- Preserve keyboard navigation, visible focus, reduced motion, 320 px reflow, and practical touch targets.
- Extend tutorial/cheatsheet content with the shortest useful explanation of patches and Shadow layers.
- Keep the existing voice filter, Body, shared effects, performance gestures, and keyboard visually subordinate to the selected sound task.

Exit: a beginner can select a patch, enable a Shadow, balance it, audition it, undo it, and understand what changed without opening Code.

### Phase 5 — Notation, editor, and documentation

- Parse and serialize format version, patch provenance, engine, and Shadow settings.
- Keep all v1 examples valid and add v2 round-trip fixtures.
- Update CodeMirror completions, syntax ranges, error messages, formatting, and change summaries.
- Update `CODE_SECTION_GUIDE.md`, `README.md`, and the live/offline rendering note.
- Add a focused sound-pack extension contract beside the existing style-system documentation.

Exit: UI edits and Code edits round-trip exactly, and a saved project reopens with the same sound.

### Phase 6 — Content expansion and hardening

- Add Fractured Relay and Low Cinema after the architecture passes performance checks.
- Retune selected built-in styles and headline scenes to reference layered patches where the change is musically meaningful.
- Do not layer every scene by default; contrast is more valuable than constant density.
- Run the full unit, lint, build, and production-browser smoke suites.
- Test import of old `.violet` files and old IndexedDB snapshots in addition to clean projects.

Exit: twenty total built-in patches, backward compatibility, accessible UI, and stable live/offline behavior.

## Test matrix

### Model and packs

- Unique stable pack and patch ids.
- Valid versions, roles, engines, bounds, and enabled states.
- Deep clone behavior for nested layers.
- Patch application never mutates the registry or input composition.
- Manual edits move patch provenance to Custom.
- Preserve voice design includes patch, Primary, Shadow, channel, and envelope settings.

### Migration and notation

- Current compositions migrate to equivalent one-layer v2 voices.
- Migration is idempotent.
- Existing scene and parser fixtures remain valid.
- v2 notation round-trips without dropping layer data.
- Friendly errors cover unknown packs, unknown engines, role incompatibility, and every bound.
- Removed lines return to deterministic defaults rather than inheriting hidden state.

### Audio behavior

- Every engine can initialize, update, trigger, release, panic, and dispose.
- Pitched octave offsets preserve valid note bounds.
- Mute/solo applies to both layers.
- Automation affects the shared channel exactly once.
- Repeated engine changes create no duplicate trigger or stale scheduled event.
- Offline renders are deterministic for a fixed seed and configuration.
- Maximum-density scenes stay finite and within the limiter contract.

### UI and accessibility

- Voice tabs filter incompatible patches.
- Layer enabled state and current slot are not communicated by color alone.
- Patch application, manual layer edits, undo, and redo remain synchronized with Code.
- Keyboard focus order is logical through patch, layer, filter, envelope, and effects controls.
- Narrow-screen layout does not hide Primary/Shadow identity or current values.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Layering overwhelms the simple instrument UI | Fixed two-slot rack, collapsed advanced controls, role-filtered patches, and shared voice controls. |
| CPU spikes with dual polyphonic layers | Profile first, cap total polyphony, conservative releases, and postpone engines that need costly manual pooling. |
| Live and WAV output diverge | Shared factories/mappings/event plans plus per-engine offline tests before UI completion. |
| Existing projects change sound | Explicit v1 migration to current engines with Shadow disabled; regression fixtures from current scenes. |
| Patches become opaque presets | Serialize concrete values and expose common controls; patch id is provenance only. |
| Too many engine-specific parameters leak into the model | One bounded Character macro per layer with pure documented mappings. |
| Layer gain drives distortion/limiting unintentionally | Layer trim, Shadow defaults below Primary, stress renders, and comparison at controlled loudness. |
| Sound-pack imports become a security/versioning project | Built-in data only for this milestone; external pack import remains a later validated-data feature. |

## Decisions made by this plan

- Keep five fixed sequencer lanes, including the opt-in Signal lead; do not add arbitrary tracks.
- Use two layers per voice, not arbitrary layer counts.
- Use Tone.js engines already installed; add no new runtime package initially.
- Remain synthesized/procedural and sample-free for this milestone.
- Treat sound packs as versioned data registries separate from styles.
- Serialize explicit sound settings, with patch ids used only as provenance.
- Introduce a real composition format version and migrate old data.
- Require live/offline parity before expanding the full content catalog.

## Deliberate non-goals

- Additional sequencer tracks beyond Signal or a mixer with arbitrary channels.
- User-uploaded samples, remote sample libraries, or Tone `Sampler` presets.
- Third-party sound-pack import in the first release.
- Arbitrary modulation routing or a modular patching canvas.
- Per-layer effects chains, automation lanes, mute, or solo.
- More than two layers per voice.
- A complete acoustic-instrument emulation library.

## Definition of done

This expansion is complete when:

- Old projects and `.violet` files load with their expected sound.
- Each voice can use a Primary and optional Shadow layer.
- At least twelve initial built-in patches offer audibly distinct, theme-consistent instruments.
- Patch and layer edits are serializable, undoable, queue safely during playback, and survive reload.
- All initial engines work in both live playback and offline WAV rendering.
- Layering remains stable under dense chords, ratchets, long releases, and Overclock.
- Instrument controls remain understandable, keyboard accessible, responsive, and consistent with the Blacklight style guide.
- Unit tests, lint, build, and the production-browser smoke test pass.

## Recommended first implementation slice

Build one complete vertical slice before authoring the full library:

1. Add v2 migration and two layer slots.
2. Implement `subtractive`, `fm`, and `am` pitched adapters plus existing `membrane` and `noise` adapters.
3. Ship **Quiet Circuit**, **Glass Choir**, **Underline**, and **Undertow**.
4. Complete live playback, offline rendering, notation round-trip, UI selection, undo/redo, and persistence for those four patches.
5. Profile and listen before adding dual, metal, pluck, and the remaining packs.

That slice proves the hard architecture while producing an immediately audible improvement.
