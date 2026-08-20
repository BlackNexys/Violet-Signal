# Configuring the Violet Signal Code section

This guide is a configuration reference for both human musicians and AI assistants. Violet Signal's Code section uses a small declarative music language—it does **not** execute JavaScript or general-purpose code.

The safest editing rule is simple: start with the complete scene currently shown in Code, preserve its structure, and change only the values or musical events you intend to change.

## Quick workflow

1. Open **Code** and use the existing generated scene as the source of truth.
2. If playback is running, choose when valid edits should apply: **next step**, **next beat**, or **next bar**. Next bar is the least surprising choice for structural changes.
3. Change one section at a time.
4. Check the status immediately above the editor:
   - **Signal in tune** means the draft is valid and active.
   - **Queued** means the valid draft will become active at the selected musical boundary.
   - A red **Line …** message means the draft is invalid. Click it to navigate to the problem.
5. Use **Format** to return the latest valid or queued composition to canonical formatting. This is also a quick way to discard an invalid draft.
6. Press **Ctrl + Space** in the editor to open suggestions.

Visual controls and Code represent the same composition. Visual changes rewrite the Code section; valid code changes update the visual controls and sequencer.

> Important: every valid draft is parsed into a fresh composition. Removing a line does not preserve the old value—it allows that field to return to its default. Preserve the complete generated scene when editing an existing project.

## The shape of a scene

A scene begins with a quoted name, contains `control: value` lines, and ends with a closing brace on its own line.

```text
scene "Your Scene Name" {
  format-version: 3
  style: darkwave
  style-version: 1
  influences: ambient=0.2
  tempo: 104
  meter: 4/4
  steps: 16
  swing: 0.035
  seed: 712
  scale: C minor
  lock: on
  patterns: A B C D
  active: A
  arrangement: A A[transpose=12] B[mute=pulse] C[layers=chords:shadow]

  // Voice, effect, pattern, and automation lines go here.
}
```

Indentation is optional but recommended. Blank lines are allowed. Comments must occupy their own line and begin with `//`; inline comments are not supported. Unknown controls are rejected instead of being ignored.

## How steps map to beats

Every cell is a sixteenth note, but a pattern can contain `8`, `12`, `14`, `16`, `20`, `24`, `28`, `32`, or `64` cells. The meter controls how cells group into beats: `/4` meters use four cells per beat (`1 e & a`), while `/8` meters use two (`1 &`). A pattern may therefore represent one bar or a longer phrase.

| Beat | Step numbers | Count |
| --- | --- | --- |
| 1 | `01 02 03 04` | `1 e & a` |
| 2 | `05 06 07 08` | `2 e & a` |
| 3 | `09 10 11 12` | `3 e & a` |
| 4 | `13 14 15 16` | `4 e & a` |

For example, in 4/4 steps `01 05 09 13` are the four quarter-note downbeats. Steps `03 07 11 15` are their offbeat eighth notes. In 7/8, fourteen cells make seven eighth-note beats.

## Global configuration

| Control | Accepted value | Meaning |
| --- | --- | --- |
| `format-version` | Whole number `1`–`3` | Composition schema. The app currently writes `3`; missing values import as legacy v1. |
| `style` | Any built-in style id | Primary production vocabulary. `world` remains accepted for older projects. |
| `style-version` | Whole number `1`–`999` | Recipe schema version written by the app; normally leave it unchanged. |
| `influences` | `style-id=0..0.8`, or `none` | Optional secondary style blend; the Style Lab currently writes one influence. |
| `tempo` | `40`–`220` | Beats per minute. |
| `meter` | `4/4`, `3/4`, `6/8`, `5/4`, or `7/8` | Beat grouping and transport emphasis. |
| `steps` | `8`, `12`, `14`, `16`, `20`, `24`, `28`, `32`, or `64` | Number of cells in every pattern. Put this before event lines. |
| `swing` | `0`–`0.75` | Delays alternating steps while keeping step 01 and the loop seam anchored. |
| `seed` | Whole number `0`–`2147483647` | Makes Ghost and other chance behavior repeatable. |
| `scale` | Root plus `minor`, `major`, `dorian`, `phrygian`, `harmonic minor`, `melodic minor`, or `pentatonic` | Scale used by scale-aware keys and chord suggestions. Pentatonic is the minor-pentatonic interval set. |
| `lock` | `on` or `off` | Enables or disables scale locking in the visual instrument. |
| `patterns` | `A B C D` exactly once each | Declares the four available patterns. Keep this line unchanged. |
| `active` | `A`, `B`, `C`, or `D` | Pattern shown for editing. The arrangement decides what playback sounds. |
| `arrangement` | Between 1 and 16 pattern occurrences | Phrase order plus optional occurrence transforms. Neutral entries remain bare letters. |
| `output` | `-36`–`-6` | Master level before final limiting and WAV normalization. Start near `-12`. |

Use integer seeds when asking an AI for variations. Reusing the same seed keeps probabilistic details deterministic.

### Arrangement occurrence transformations

An arrangement entry begins with `A`, `B`, `C`, or `D`. Optional brackets change only that occurrence; they never rewrite the source pattern.

```text
arrangement: A A[transpose=12] B[mute=pulse+texture] C[layers=chords:shadow+bass:primary]
```

Inside the brackets, comma-separated settings have a fixed meaning:

- `transpose` is a whole number from `-24` to `24` semitones and affects Chord and Bass notes only.
- `mute` lists one or more voices joined by `+`: `chords`, `bass`, `pulse`, or `texture`.
- `layers` lists `voice:all`, `voice:primary`, or `voice:shadow` assignments joined by `+`.
- `shadow` explicitly plays the configured Shadow for that occurrence even when its normal enabled switch is off. `all` follows the normal Shadow enabled state.

Canonical formatting orders settings as `transpose`, `mute`, then `layers`, and orders voices as Chord, Bass, Pulse, Texture. Pattern automation resolves first; these occurrence transforms resolve afterward. Performance gestures and final audio safety mapping remain later stages.

WAV export reproduces the written gain staging and effects, then peak-normalizes the completed file to `−1 dBFS`. The `output` value still changes how strongly the signal reaches the drive/limiter stages, but it no longer leaves an otherwise healthy export unnecessarily quiet. Peak normalization is not commercial loudness mastering.

## Voice configuration

There are four voices: `chords`, `bass`, `pulse`, and `texture`. Each has a required Primary layer and an optional Shadow layer. A voice line configures the Primary source and its shared channel; a `layer … shadow` line configures the second source. Old voice lines remain valid and receive the role's original engine with Shadow off.

```text
patch chords: veil-archive/glass-choir@1
voice chords: triangle engine=am octave=0 detune=0 layer-level=-2 character=0.42 attack-scale=1.15 release-scale=1.2 filter=lowpass cutoff=2450 resonance=1.1 glide=0 volume=-13 attack=0.34 decay=0.86 sustain=0.68 release=3.4 mute=off solo=off
layer chords shadow: on engine=fm waveform=sine octave=1 detune=7 level=-17 character=0.5 attack-scale=1.65 release-scale=1.35
```

`patch` records where the settings came from; the explicit voice and layer values are authoritative. Use `patch chords: custom` after hand-authoring a sound. The Instrument does this automatically after manual sound edits.

| Setting | Accepted value | Meaning |
| --- | --- | --- |
| First token | `sine`, `triangle`, `square`, or `sawtooth` | Primary waveform. Noise engines map these choices to procedural noise colors. |
| `engine` | Chord/Bass: `subtractive`, `fm`, `am`, `dual`, `pluck`; Pulse: `membrane`, `metal`, `noise`; Texture: `metal`, `noise` | Bounded synthesis model compatible with that voice. |
| `octave` | Whole number `-2`–`2` | Primary pitch shift without editing written notes. |
| `layer-level` | `-36`–`0` | Primary source level before the voice channel. |
| `character` | `0`–`1` | Engine-specific tone macro. |
| `attack-scale` / `release-scale` | `0.25`–`4` | Multiplies the shared envelope for this layer. |
| `volume` | `-36`–`-4` | Voice level in dB. |
| `filter` | `lowpass`, `bandpass`, or `highpass` | Filter shape. |
| `cutoff` | `80`–`12000` | Filter cutoff or center frequency in Hz. |
| `resonance` | `0`–`12` | Emphasis around the cutoff. High values can become sharp. |
| `detune` | `-100`–`100` | Oscillator tuning offset in cents. |
| `glide` | `0`–`0.5` | Portamento in seconds; most audible on Bass. |
| `attack` | `0.005`–`2` | Fade-in time in seconds. |
| `decay` | `0.02`–`3` | Time from the attack peak to sustain. |
| `sustain` | `0`–`1` | Held amplitude. |
| `release` | `0.03`–`5` | Fade-out time after release. |
| `mute` | `on` or `off` | Silences this voice. |
| `solo` | `on` or `off` | Silences every voice that is not soloed. |

Shadow syntax starts with `on` or `off`, followed by `engine`, `waveform`, `octave`, `detune`, `level`, `character`, `attack-scale`, and `release-scale`. Canonical formatting writes every field even when Shadow is off.

Long attacks can make a correctly timed note feel late. For sharp pulse or bass events, keep attack near `0.005`–`0.03`. Longer chord and texture attacks are useful for pads.

## Shared sound controls

```text
memory: 0.3
environment: 0.35
veil: 0.55
fracture: 0.08
ghost: 0.12
humanize: 0.025
overclock: 0.1
output: -12
```

| Control | Range | Conventional meaning |
| --- | --- | --- |
| `memory` | `0`–`1` | Delay amount and feedback. |
| `environment` | `0`–`1` | Generated reverb and spatial depth. |
| `veil` | `0`–`1` | Chorus width and modulation. |
| `fracture` | `0`–`1` | Bit-depth reduction and digital erosion. |
| `ghost` | `0`–`1` | Seeded probability of altered or unexpected events. |
| `humanize` | `0`–`0.2` | Deterministic timing variation. The first step remains locked to the loop grid. |
| `overclock` | `0`–`1` | Combined brightness, drive, activity, and instability. Sustained extremes trigger recovery. |

For controlled results, change one of these controls at a time. High Memory or Environment can make one bar overlap the next; that is an effect tail, not a transport delay.

## Writing notes and chords

Chord and bass lanes use sparse `step=value` assignments.

```text
notes A: 01=C4+Eb4+G4~4 09=Ab3+C4+Eb4~4
bass A: 01=C2~4 09=Ab1~4
```

- `01=` places the event at step 01.
- Join chord pitches with `+`.
- Add `~1`, `~2`, `~3`, `~4`, or `~8` to hold the event for that many steps.
- Without `~length`, the event lasts one step.
- Bass accepts one pitch per assignment; chords accept one or more pitches.
- Note names use an uppercase letter, an optional `#` or `b`, and an octave: `C4`, `Eb4`, `F#3`.
- Use `none` for an empty lane.

Assignments on the same line are separated by spaces. Do not use commas.

## Writing Pulse, Texture, and emphasis

Pulse and Texture list hit positions directly:

```text
pulse A: 01 05 09 13
texture A: 04 12
emphasis A: 01=0.92 05=0.62 09=0.84 13=0.58
```

- `pulse` triggers the percussion voice.
- `texture` triggers a procedural-noise event.
- `emphasis` sets step velocity from `0.1` to `1`.
- Steps without an emphasis assignment use the default `0.72`.
- An empty lane is written as `pulse B: none`, not as a blank value.

## Step automation

Automation uses `automate control pattern: step=value`.

```text
automate mask A: 01=1100 05=2400 09=4200 13=1700
automate memory A: 01=0.18 13=0.52
automate veil A: 01=0.35 09=0.72
automate fracture A: 01=0.04 15=0.55
automate ghost A: 01=0.08 13=0.28
automate overclock A: 01=0.05 09=0.32
```

Automation is held from its latest point until another point changes it, including across the loop boundary. `mask` accepts `80`–`12000`; Memory, Veil, Fracture, Ghost, and Overclock accept `0`–`1`. Use `none` when a lane has no automation.

Automation note lengths are not meaningful. Write `09=0.72`, not `09=0.72~4`.

## Per-step expression and groove

These lanes change whether and when a step plays without changing its note assignments:

```text
chance A: 07=0.65 15=0.4
ratchet A: 11=2 15=3
shift A: 03=-0.08 07=0.12
```

- `chance` accepts `0`–`1`; the seed makes the result repeatable in live playback and WAV export.
- `ratchet` accepts whole numbers `1`–`4` and repeats all events on that step inside its duration.
- `shift` accepts `-0.45`–`0.45`; negative values are early and positive values are late. Step 01 remains locked to prevent a loop-seam delay.
- Use `none` when every step uses its default (`chance=1`, `ratchet=1`, `shift=0`).

## A compact valid example

This scene can be pasted directly into the Code section:

```text
scene "Neon Séance" {
  style: witch-house
  style-version: 1
  influences: ambient=0.2
  tempo: 72
  meter: 4/4
  steps: 16
  swing: 0.06
  seed: 1999
  scale: C minor
  lock: on
  patterns: A B C D
  active: A
  arrangement: A A B A
  voice chords: triangle volume=-11 cutoff=2100 attack=0.12 decay=0.7 sustain=0.66 release=2.4 mute=off solo=off
  voice bass: sawtooth volume=-10 cutoff=680 attack=0.012 decay=0.35 sustain=0.5 release=0.8 mute=off solo=off
  voice pulse: sine volume=-17 cutoff=1900 attack=0.005 decay=0.1 sustain=0 release=0.06 mute=off solo=off
  voice texture: triangle volume=-24 cutoff=1300 attack=0.1 decay=0.7 sustain=0.1 release=2 mute=off solo=off
  memory: 0.48
  environment: 0.62
  veil: 0.52
  fracture: 0.12
  ghost: 0.18
  humanize: 0.035
  overclock: 0.08
  output: -12

  notes A: 01=C4+Eb4+G4~8 09=Ab3+C4+Eb4~8
  bass A: 01=C2~4 09=Ab1~4
  pulse A: 01 07 09 15
  texture A: 04 12
  emphasis A: 01=0.9 09=0.82
  automate mask A: 01=1600 09=2600
  automate memory A: none
  automate veil A: 01=0.42 09=0.66
  automate fracture A: 01=0.08 13=0.22
  automate ghost A: none
  automate overclock A: none

  notes B: 01=F3+Ab3+C4~4 05=G3+Bb3+D4~4 09=Ab3+C4+Eb4~8
  bass B: 01=F1~4 05=G1~4 09=Ab1~8
  pulse B: 01 05 09 13
  texture B: 03 11
  emphasis B: 01=0.88 09=0.84
  automate mask B: 01=1900 09=3300
  automate memory B: none
  automate veil B: none
  automate fracture B: 13=0.28
  automate ghost B: none
  automate overclock B: none

  notes C: none
  bass C: none
  pulse C: none
  texture C: none
  emphasis C: none
  automate mask C: none
  automate memory C: none
  automate veil C: none
  automate fracture C: none
  automate ghost C: none
  automate overclock C: none

  notes D: none
  bass D: none
  pulse D: none
  texture D: none
  emphasis D: none
  automate mask D: none
  automate memory D: none
  automate veil D: none
  automate fracture D: none
  automate ghost D: none
  automate overclock D: none
}
```

## Built-in style vocabulary

These are creative starting points, not parser requirements.

| Family | Included styles |
| --- | --- |
| Atmospheric | `ambient`, `berlin-school` |
| Wave & pop | `synthpop`, `new-wave`, `darkwave`, `witch-house` |
| Club | `house`, `techno`, `acid`, `trance` |
| Breakbeat | `electro`, `drum-and-bass`, `hip-hop` |
| Industrial | `industrial-ebm` |
| Retro | `synthwave`, `darksynth`, `chiptune` |
| Experimental / cinematic | `glitch`, `cinematic` |

The Style Lab can transform tempo, timing, voices, effects, harmony, patterns, and arrangement independently. The `style` line itself is descriptive when edited directly; use the Style Lab when you want to apply a complete recipe. See [`project-notes/style-system.md`](project-notes/style-system.md) for the data model and extension rules.

## Common errors

| Error | Fix |
| --- | --- |
| `Step … is outside this …-step bar/pattern` | Use positions inside the configured `steps` value. |
| `needs the form 05=value` | Note, bass, emphasis, and automation tokens need `step=value`. |
| `is not a step from 01 to 16` | Pulse and Texture use bare step numbers such as `01 05 09 13`. |
| `is not a note I recognize` | Use `C4`, `Eb4`, or `F#3`; keep the note letter uppercase. |
| `Note length can be…` | Use only `~1`, `~2`, `~3`, `~4`, or `~8`. |
| `understands on or off` | Boolean settings do not accept `true`, `false`, `yes`, or `no`. |
| `is not a voice setting` | Use the documented Primary/channel settings; put Shadow-only values on a `layer … shadow` line. |
| `is not available for the … voice` | Choose an engine compatible with Chord/Bass, Pulse, or Texture as listed above. |
| `is not a layer setting` | Use engine, waveform, octave, detune, level, character, attack-scale, or release-scale. |
| `not a control in this instrument` | Remove the unknown key or translate it to a supported control. |
| `scene needs a closing }` | Put one `}` on its own final line. |

If a note sounds late even though its step is correct, check the voice `attack`, long Memory/Environment tails, and Humanize before changing its step number.

## Instructions for an AI assistant

Give the assistant the current complete scene, this guide, and a musical goal. A reliable instruction is:

```text
Edit this Violet Signal scene to meet the musical request below.

Return one complete valid Violet Signal scene and no explanation or Markdown fence.
Preserve all four patterns and every existing line unless the request requires a change.
Use only controls and ranges from CODE_SECTION_GUIDE.md.
Keep steps inside the scene's configured pattern length, note lengths in 1/2/3/4/8, and the arrangement between 1 and 16 phrases.
Do not output JavaScript, JSON, YAML, or invented controls.
Prefer changing a small number of intentional parameters over randomizing everything.

Musical request: [describe the desired change]
Current scene:
[paste the complete Code section here]
```

For a variation rather than a replacement, also say which elements must remain fixed—for example: “keep tempo, harmony, and arrangement; vary only Pulse, Texture, and Fracture automation.” This makes AI-generated edits easier to compare and undo.

## Machine-readable constraint summary

```text
header        = scene "NAME" {
style         = ambient | berlin-school | synthpop | new-wave | darkwave | witch-house | synthwave | darksynth | house | techno | acid | trance | electro | drum-and-bass | hip-hop | industrial-ebm | chiptune | glitch | cinematic
style-version = integer 1..999
influences    = STYLE=number(0..0.8) [...] | none
tempo         = number 40..220
meter         = 4/4 | 3/4 | 6/8 | 5/4 | 7/8
steps         = 8 | 12 | 14 | 16 | 20 | 24 | 28 | 32 | 64
swing         = number 0..0.75
seed          = integer 0..2147483647
scale         = NOTE_ROOT (minor | major | dorian | phrygian | harmonic minor | melodic minor | pentatonic)
lock          = on | off
patterns      = A B C D
active        = A | B | C | D
arrangement   = 1..16 OCCURRENCE values
OCCURRENCE    = (A | B | C | D) ["[" OCCURRENCE_OPTION ["," OCCURRENCE_OPTION...] "]"]
transpose     = integer -24..24
mute          = chords | bass | pulse | texture, joined by +
layers        = VOICE:(all | primary | shadow), joined by +
waveform      = sine | triangle | square | sawtooth
filter_type   = lowpass | bandpass | highpass
resonance     = number 0..12
detune        = number -100..100
glide         = number 0..0.5
note_event    = STEP=NOTE[+NOTE...][~LENGTH]
bass_event    = STEP=NOTE[~LENGTH]
STEP          = 01..configured_steps
LENGTH        = 1 | 2 | 3 | 4 | 8
hit_lane      = STEP [STEP...] | none
emphasis      = STEP=number(0.1..1) [...] | none
chance        = STEP=number(0..1) [...] | none
ratchet       = STEP=integer(1..4) [...] | none
shift         = STEP=number(-0.45..0.45) [...] | none
automation    = STEP=value [...] | none
mask_value    = 80..12000
effect_value  = 0..1
humanize      = 0..0.2
output        = -36..-6
footer        = }
```

When in doubt, make the smallest valid edit, preserve the current structure, and let Violet Signal's error message identify the first incompatible line.
